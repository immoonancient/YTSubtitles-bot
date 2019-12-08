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


const Channels = require('./channels.js');

class Contribution {
  constructor(id) {
    this.id = id;
    this.translations = [];
    this.reviews = [];
  }

  addTranslation(number) {
    this.translations.push(number);
  }

  addReview(number) {
    this.reviews.push(number);
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

async function matchIssue(channel, pull) {
  
}

async function matchIssues(channel, pulls) {
  result = {};
  for (let number in pulls) {
    const issue = await matchIssue(channel, pull);
    result[issue.number] = issue;
    console.log(`Pull #${number}  matches issue #${issue.number}`)
  }
  return result;
}

async function getContributionList(channel, startDate, endDate) {
  const channelName = channel.label;

  const pulls = await listPulls(channel, startDate, endDate);
  const issues = await matchIssues(channel, pulls);
}

const channel = Channels.findChannelFromTitle('[王刚]');
const startDate = new Date(2019, 10, 1);
const endDate = new Date(2019, 11, 1);

console.log(startDate);
console.log(endDate);

getContributionList(channel, startDate, endDate);