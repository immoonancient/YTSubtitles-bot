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
      repo: process.env.repo
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
};

async function listPulls(channel, startDate, endDate) {
  const result = {};
  for (let page = 1; ; ++page) {
    let allPulls;
    try {
      allPulls = await octokit.pulls.list({
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        state: 'all',
        per_page: 100,
        page: page});
    } catch (error) {
      console.log(error);
      break;
    }
    if (!allPulls)
      break;

    let lastPage = false;
    for (let pull of allPulls.data) {
      const labels = pull.labels.map(label => label.name);
      if (!labels || Channels.findChannelFromLabels(labels) != channel)
        continue;
      const date = new Date(pull.created_at);
      if (date >= endDate)
        continue;
      if (date < startDate) {
        lastPage = true;
        break;
      }

      console.log(`Pull request found: #${pull.number} ${date}`);
      result[pull.number] = pull;
    }
    if (lastPage)
      break;
  }
  return result;
}

async function matchIssues(channel, pulls) {
  result = {};
  for (let number in pulls) {
    const issueNumber = await Utils.getSubtitleIssueNumber(mockContext, pulls[number]);
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
  return contributions;
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
  for (let name in contributions)
    result.push(contributions[name].prettyPrint());
  return result.join('\n');
}

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