const fetch = require('node-fetch');
const Formatter = require('./formatter/formatter.js');
const JsonSchema = require('jsonschema');

function checkParameters(context, params) {
  const payload = context.payload;
  const boilerplate = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    head_sha: payload.check_run ? payload.check_run.head_sha : payload.check_suite.head_sha
  };
  return Object.assign(boilerplate, params);
}

async function runSubtitleFileCheckOn(context, pull, file) {
  console.log(`runSubtitleFileCheckOn ${file.filename}`);
  const runName = `Subtitle file format checking on ${file.filename}`;
  const outputTitle = 'Subtitle file format checking';
  const annotations = [];

  function appendAnnotation(annotation) {
    annotations.push(Object.assign(
      { path: file.filename },
      annotation
    ));
  }

  const format = function() {
    if (file.filename.endsWith('.sbv'))
      return 'sbv';
    if (file.filename.endsWith('.srt'))
      return 'srt';
    return null;
  }();

  const fileText = await fetch(file.raw_url).then(r => r.text());
  const lines = fileText.split('\n');

  // TODO: We should split parser and formatter logic

  const result = Formatter.checkFormat(file, lines, format);

  result.annotations.forEach(appendAnnotation);
  context.github.checks.create(checkParameters(
    context,
    {
      name: runName,
      status: 'completed',
      conclusion: result.conclusion,
      output: {
        title: outputTitle,
        summary: result.summary,
        text: result.text,
        annotations: annotations,
      }
    }));
}

async function runJsonFileCheckOn(context, pull, file) {
  console.log(`runJsonFileCheckOn ${file.filename}`);

  let jsonFileError = null;
  const fileJson = await fetch(file.raw_url)
      .then(r => r.json())
      .then(
        json => json,
        error => {
          jsonFileError = error;
          return null;
        });

  const jsonValidityCheckName = `JSON validity check on ${file.filename}`;
  context.github.checks.create(checkParameters(
    context,
    {
      name: jsonValidityCheckName,
      status: 'completed',
      conclusion: fileJson ? 'success' : 'failure',
      output: {
        title: jsonValidityCheckName,
        summary: `${file.filename} ${fileJson ? 'is' : 'is not'} a valid JSON file`,
        text: jsonFileError ? jsonFileError.toString() : undefined,
      }
    }));

  if (!fileJson)
    return;

  const jsonSchemaCheckName = `jsonschema validation on ${file.filename}`;

  let instanceJson;
  let schemaJson;

  if (file.filename.endsWith('.schema.json')) {
    schemaJson = fileJson;

    const instanceUrl = file.raw_url.substring(0, file.raw_url.length - 'schema.json'.length) + 'json';
    console.log(`Trying to get json instance file at ${instanceUrl}`);

    try {
      instanceJson = await fetch(instanceUrl).then(r => r.json());
    } catch (error) {
      context.github.checks.create(checkParameters(
        context,
        {
          name: jsonSchemaCheckName,
          status: 'completed',
          conclusion: 'cancelled',
          output: {
            title: jsonSchemaCheckName,
            summary: `Could not find matching json instance for schema file ${file.filename}`,
            text: error.toString(),
          }
        }));
      return;
    }

  } else {
    instanceJson = fileJson;

    const schemaUrl = file.raw_url.substring(0, file.raw_url.length - 'json'.length) + 'schema.json';
    console.log(`Trying to get json schema file at ${schemaUrl}`);

    try {
      schemaJson = await fetch(schemaUrl).then(r => r.json());
    } catch (error) {
      context.github.checks.create(checkParameters(
        context,
        {
          name: jsonSchemaCheckName,
          status: 'completed',
          conclusion: 'cancelled',
          output: {
            title: jsonSchemaCheckName,
            summary: `Could not find matching jsonschema for file ${file.filename}`,
            text: error.toString(),
          }
        }));
      return;
    }

  }

  const result = JsonSchema.validate(instanceJson, schemaJson);

  if (!result.errors.length) {
    context.github.checks.create(checkParameters(
      context,
      {
        name: jsonSchemaCheckName,
        status: 'completed',
        conclusion: 'success',
        output: {
          title: jsonSchemaCheckName,
          summary: `${jsonSchemaCheckName} passed`
        }
      }));
    return;
  }

  context.github.checks.create(checkParameters(
    context,
    {
      name: jsonSchemaCheckName,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: jsonSchemaCheckName,
        summary: `${jsonSchemaCheckName} found the following errors`,
        text: result.errors.map(error => error.toString()).join('\n\n'),
      }
    }));
}

// TODO: This should also be called when new reviews are created.
async function checkUnresolvedReviewsOn(context, pull) {
  // Use GraphQL because REST doesn't support this
  const graphql = require('./auth.js').graphqlWithAuth();

  function buildQueryString(hasCursor) {
    return `
    query reviewCommentThreads($owner: String!, $repo: String!, $number: Int!, ${hasCursor ? '$cursor: String!' : ''}) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviews(first: 1) {
            totalCount
          }
          reviewThreads(first: 100, ${hasCursor ? 'after: $cursor' : ''}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              isResolved
            }
          }
        }
      }
    }
  `};

  const { repository } = await graphql({
    query: buildQueryString(false),
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    number: pull.number,
  });

  while (repository.pullRequest.reviewThreads.pageInfo.hasNextPage) {
    const nextPage = await graphql({
      query: buildQueryString(true),
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: pull.number,
      cursor: repository.pullRequest.reviewThreads.pageInfo.endCursor,
    });
    repository.pullRequest.reviewThreads.nodes.push(...nextPage.repository.pullRequest.reviewThreads.nodes);
    repository.pullRequest.reviewThreads.pageInfo = nextPage.repository.pullRequest.reviewThreads.pageInfo;
  }

  const checkName = 'Check if all review comments are resolved';

  const threads = repository.pullRequest.reviewThreads.nodes;
  if (!threads.length && !repository.pullRequest.reviews.totalCount) {
    context.github.checks.create(checkParameters(
      context,
      {
        name: checkName,
        status: 'completed',
        conclusion: 'failure',
        output: {
          title: checkName,
          summary: 'Pull request has not been reviewed yet',
          text: 'Please re-run after the pull request has been reviewed',
        }
      }));
    return;
  }

  const conclusion = threads.some(thread => !thread.isResolved) ? 'failure' : 'success';
  const summary = conclusion === 'success' ? 'All review comments have been resolved' : 'Some review comments are not resolved';
  const text = conclusion === 'success' ? undefined : 'Please re-run after resolving all review comments';

  context.github.checks.create(checkParameters(
    context,
    {
      name: checkName,
      status: 'completed',
      conclusion: conclusion,
      output: {
        title: checkName,
        summary: summary,
        text: text,
      }
    }));
}

async function runCheckSuiteOn(context, pull) {
  console.log('runCheckSuiteOn ${pull.number}');
  checkUnresolvedReviewsOn(context, pull);

  const files = await context.github.pulls.listFiles(context.issue({pull_number: pull.number}));
  files.data.forEach(file => {
    if (file.filename.startsWith('subtitles/'))
      runSubtitleFileCheckOn(context, pull, file);
    if (file.filename.endsWith('.json'))
      runJsonFileCheckOn(context, pull, file);
  });
}

async function populatePulls(context, suite) {
  if (suite.pull_requests.length)
    return suite.pull_requests;
  const response = await context.github.pulls.list({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    state: 'open',
    base: 'master',
    head: `${context.payload.repository.owner.login}:${suite.head_branch}`
  });
  return response.data;
}

async function runCheckSuite(context) {
  const payload = context.payload;
  const suite = payload.check_suite || payload.check_run.check_suite;
  const pulls = await populatePulls(context, suite);
  pulls.forEach(pull => runCheckSuiteOn(context, pull));

  context.github.checks.create(checkParameters(
    context,
    {name: 'All checks triggered', status: 'completed', conclusion: 'success'}));
}

module.exports = {
  runCheckSuite: runCheckSuite,
}