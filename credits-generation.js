require('dotenv').config();

async function createMockContext() {
  const Auth = require('./auth.js');
  const octokit = await Auth();

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
  return mockContext;
}

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
    return this.translations.length * 2 + this.reviews.length;
  }
};

async function listPulls(context, channel, startDate, endDate) {
  const result = {};

  async function handlePull(pull, done) {
    const labels = pull.labels.map(label => label.name);
    if (!labels || (await Channels.findChannelFromLabels(labels)) != channel)
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

  const options = context.github.pulls.list.endpoint.merge({
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        state: 'all'});
  const allPulls = [];
  await context.github.paginate(options, (response, done) => {
    allPulls.push(...response.data.map(pull => handlePull(pull, done)));
  });

  await Promise.all(allPulls);
  console.log('All pull requests listed');
  return result;
}

async function matchIssues(context, channel, pulls) {
  const result = {};
  async function matchIssue(pull) {
    const issueNumber = await Utils.getSubtitleIssueNumber(context, pull);
    if (!issueNumber) {
      console.log(`Failed to find matching issue number for pull request #${pull.number}`);
      return;
    }
    console.log(`Pull #${pull.number} matches issue #${issueNumber}`)
    const issue = await Utils.getIssue(context, issueNumber);
    pull.matchedIssue = issue;
    result[issue.number] = issue;
  }

  await Promise.all(
    Object.keys(pulls).map(
      number => matchIssue(pulls[number])));
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

async function countReviewContributions(context, pulls, contributions) {
  async function countReviewsInPull(number) {
    async function hasValidReviews(reviews) {
      let commentCount = 0;
      for (let review of reviews) {
        // Approvals and changes needed are valid reviews
        if (review.state !== 'COMMENTED')
          return true;
        // Repo owner sometimes does some trivial modifications like formatting
        // Discard his reviews if he didn't explicit state approval
        if (review.user.login === process.env.REPO_OWNER)
          continue;
        // A rough heuristic: someone with >= 5 comments on a pull request counts as a review
        const comments = await context.github.pulls.getCommentsForReview(context.issue({pull_number: number, review_id: review.id}));
        commentCount += comments.data.length;
      }
      if (commentCount >= 5)
        return true;
      console.log(`User @${reviews[0].user.login} commented on #${number} but doesn't count`);
      return false;
    }

    async function collectValidReviews(userReviews) {
      const name = userReviews[0].user.login;
      if (name === pulls[number].matchedIssue.assignee.login)
        return;
      if (!await hasValidReviews(userReviews))
        return;
      if (!contributions[name])
        contributions[name] = new Contribution(name);
      contributions[name].addReview(number);
    }

    const reviews = {};
    for (let review of await Utils.getReviews(context, number)) {
      const name = review.user.login;
      if (!reviews[name])
        reviews[name] = [];
      reviews[name].push(review);
    }
    await Promise.all(Object.keys(reviews).map(name => collectValidReviews(reviews[name])));
  }

  await Promise.all(
    Object
      .keys(pulls)
      .filter(number => pulls[number].matchedIssue)
      .map(number => countReviewsInPull(number)));
}

async function getContributionList(channel, startDate, endDate) {
  const mockContext = await createMockContext();

  const channelName = channel.label;

  const pulls = await listPulls(mockContext, channel, startDate, endDate);
  const issues = await matchIssues(mockContext, channel, pulls);

  const contributions = {};
  await countTranslationContributions(issues, contributions);
  await countReviewContributions(mockContext, pulls, contributions);

  const contributionList = Object.keys(contributions).map(name => contributions[name]);

  contributionList.sort((c1, c2) => c2.countContributions() - c1.countContributions());

  return contributionList;
}

// Note: monthIndex is 0-based, i.e., January is 0, not 1
async function createContributionTable(channelName, year, monthIndex) {
  const channel = await Channels.findChannelFromTitle(`[${channelName}]`);
  const startDate = new Date(year, monthIndex);
  const endDate = new Date(year, monthIndex + 1);

  const contributions = await getContributionList(channel, startDate, endDate);

  const result = [];
  result.push(`# ${channel.label} ${year} 年 ${monthIndex + 1} 月贡献统计表`);
  result.push('');
  result.push('| id | 投稿 | 审核 |');
  result.push('| -- | --- | --- |');
  for (let contribution of contributions)
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

    const channel = await Channels.findChannelFromFolder(req.query.channel);
    const startDate = new Date(req.query['start-date']);
    const endDate = new Date(req.query['end-date']);
    endDate.setDate(endDate.getDate() + 1);

    const contributions = await getContributionList(channel, startDate, endDate);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(contributions);
  });
}

module.exports = {addRoute: addRoute};
