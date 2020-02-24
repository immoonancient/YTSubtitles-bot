require('dotenv').config();

const Octokit = require('@octokit/rest');
const octokit = new Octokit({
  auth: {
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
    async on2fa() {
     return prompt("Two-factor authentication Code:");
    }
  }
});

const mockContext = {
  issue: function(params) {
    const result = {
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO
    };
    for (let key in params)
      result[key] = params[key];
    return result;
  },

  github: octokit
};

const Channels = require('./channels.js');
const Utils = require('./utils.js');

class Contribution {
  constructor(id) {
    this.id = id;
    this.translations = [];
    this.reviews = [];
  }

  addTranslation(number) {
    if (this.translations.indexOf(number) !== -1)
      return;
    this.translations.push(number);
  }

  addReview(number) {
    if (this.reviews.indexOf(number) !== -1)
      return;
    this.reviews.push(number);
  }

  get userLink() {
    return `https://github.com/${this.id}`;
  }

  prettyPrint() {
    function issueLink(number) {
      return `/../../issues/${number}`;
    }

    // First column: user id
    let result = `| [@${this.id}](${this.userLink}) |`;

    // Second column: translations
    for (let number of this.translations) {
      let current = ` [#${number}](${issueLink(number)})`;
      result += current;
    }
    result += ' |';

    // Third column: reviews
    for (let number of this.reviews) {
      let current = ` [#${number}](${issueLink(number)})`;
      result += current;
    }
    result += ' |';

    return result;
  }

  countContributions() {
    return this.translations.length + this.reviews.length;
  }
};

async function listPulls(channel, startDate, endDate) {
  const result = {};

  function handlePull(pull, done) {
    const labels = pull.labels.map(label => label.name);
    if (!labels || Channels.findChannelFromLabels(labels) != channel)
      return;
    const date = new Date(pull.created_at);
    if (date >= endDate)
      return;
    if (date < startDate) {
      done();
      return;
    }

    console.log(`Pull request found: #${pull.number} ${date}`);
    result[pull.number] = pull;
  }

  const options = octokit.pulls.list.endpoint.merge({
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        state: 'all'});
  await octokit.paginate(options, (response, done) => {
    response.data.forEach(pull => handlePull(pull, done));
  });

  console.log('All pull requests listed');
  return result;
}

async function matchIssues(channel, pulls) {
  result = {};
  for (let number in pulls) {
    const issueNumber = await Utils.getSubtitleIssueNumber(mockContext, pulls[number]);
    if (!issueNumber) {
      console.log(`Failed to find matching issue number for pull request #${number}`);
      continue;
    }
    const issue = await Utils.getIssue(mockContext, issueNumber);
    result[issueNumber] = issue;
    console.log(`Pull #${number} matches issue #${issue.number}`)
  }
  return result;
}

function countTranslationContributions(issues, contributions) {
  for (let number in issues) {
    const issue = issues[number];
    const assignees = issue.assignees || issue.assignee || [];
    for (let assignee of assignees) {
      const name = assignee.login;
      if (!contributions[name])
        contributions[name] = new Contribution(name);
      contributions[name].addTranslation(number);
    }
  }
}

async function countReviewContributions(pulls, contributions) {
  for (let number in pulls) {
    const reviews = await Utils.getReviews(mockContext, number);
    for (let review of reviews) {
      // TODO: Filter out non-review operations while reducing false negatives
      if (review.state === 'COMMENTED')
        continue;
      const name = review.user.login;
      if (!contributions[name])
        contributions[name] = new Contribution(name);
      contributions[name].addReview(number);
    }
  }
}

async function getContributionList(channel, startDate, endDate) {
  const channelName = channel.label;

  const pulls = await listPulls(channel, startDate, endDate);
  const issues = await matchIssues(channel, pulls);

  const contributions = {};
  await countTranslationContributions(issues, contributions);
  await countReviewContributions(pulls, contributions);

  const contributionsList = Object.keys(contributions).map(function(name) {
    return contributions[name];
  });

  contributionsList.sort(function(c1, c2) {
    return c1.countContributions - c2.countContributions;
  });

  return contributionsList;
}

// Note: monthIndex is 0-based, i.e., January is 0, not 1
async function createContributionTable(channelName, year, monthIndex) {
  const channel = Channels.findChannelFromTitle(`[${channelName}]`);
  const startDate = new Date(year, monthIndex);
  const endDate = new Date(year, monthIndex + 1);

  const contributions = await getContributionList(channel, startDate, endDate);

  const result = [];
  result.push(`# ${channel.label} ${year} 年 ${monthIndex + 1} 月贡献统计表`);
  result.push('');
  result.push('| id | 投稿 | 审核 |');
  result.push('| -- | --- | --- |');
  for (let contribution in contributions)
    result.push(contribution.prettyPrint());
  return result.join('\n');
}

/*
const argv = require('yargs')
  .option('channel', {})
  .option('year', {})
  .option('month', {})
  .demandOption(['channel', 'year', 'month'])
  .help()
  .argv;

createContributionTable(
    argv.channel,
    parseInt(argv.year),
    parseInt(argv.month) - 1)
  .then(result => process.stdout.write(result));
  */

function addRoute(router, path) {
  router.get(path, async (req, res) => {
    const query = req.query;
    if (!query['start-date'] || !query['end-date'] || !query['channel']) {
      res.sendStatus(400);
      return;
    }

    const channel = Channels.findChannelFromFolder(req.query.channel);
    const startDate = new Date(req.query['start-date']);
    const endDate = new Date(req.query['end-date']);
    endDate.setDate(endDate.getDate() + 1);

    const contributions = await getContributionList(channel, startDate, endDate);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(contributions);
  });
}

module.exports = {addRoute: addRoute};