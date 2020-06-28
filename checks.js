const fetch = require('node-fetch');
const Formatter = require('./formatter/formatter.js');

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

async function runCheckSuiteOn(context, pull) {
  console.log('runCheckSuiteOn ${pull.number}');
  const files = await context.github.pulls.listFiles(context.issue({pull_number: pull.number}));
  files.data.forEach(file => {
    if (file.filename.startsWith('subtitles/'))
      runSubtitleFileCheckOn(context, pull, file);
    // TODO: Add JSON schema checks for json files in statc/data/
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