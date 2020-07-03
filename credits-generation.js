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

async function getContributionList(mockContext, channel, startDate, endDate) {
  console.log(`getContributionList(${channel.folder}, ${startDate}, ${endDate})`);

  const channelName = channel.label;

  const pulls = await listPulls(mockContext, channel, startDate, endDate);
  if (!Object.keys(pulls).length) {
    console.log(`Didn't find any pull for ${channel.folder}`);
    return [];
  }

  const issues = await matchIssues(mockContext, channel, pulls);
  if (!Object.keys(issues).length) {
    console.log(`Didn't find any issue for ${channel.folder}`);
    return [];
  }

  const contributions = {};
  await countTranslationContributions(issues, contributions);
  await countReviewContributions(mockContext, pulls, contributions);

  const contributionList = Object.keys(contributions).map(name => contributions[name]);

  contributionList.sort((c1, c2) => c2.countContributions() - c1.countContributions());

  return contributionList;
}

// Note: monthIndex is 0-based, i.e., January is 0, not 1
async function createContributionTable(mockContext, channelName, year, monthIndex) {
  console.log(`createContributionTable(${channelName}, ${year}, ${monthIndex})`);

  const channel = await Channels.findChannelFromFolder(channelName);
  const startDate = new Date(year, monthIndex);
  const endDate = new Date(year, monthIndex + 1);

  const contributions = await getContributionList(mockContext, channel, startDate, endDate);

  const result = [];
  result.push(`# ${channel.label} ${year} 年 ${monthIndex + 1} 月贡献统计表`);
  result.push('');
  result.push('| id | 投稿 | 审核 |');
  result.push('| -- | --- | --- |');
  for (let contribution of contributions)
    result.push(contribution.prettyPrint());
  return result.join('\n');
}

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

    const mockContext = await createMockContext();
    const contributions = await getContributionList(mockContext, channel, startDate, endDate);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(contributions);
  });
}

function addRouteMarkdown(router, path) {
  router.get(path, async(req, res) => {
    const query = req.query;
    if (!query['channel'] || !query['year'] || !query['month']) {
      res.sendStatus(400);
      return;
    }

    const mockContext = await createMockContext();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(await createContributionTable(
      mockContext,
      query['channel'],
      parseInt(query['year']),
      parseInt(query['month'] - 1)));
  });
}

function addRouteCreatePull(router, path) {
  router.options(path, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.sendStatus(200);
  });

  router.post(path, async(req, res) => {
    if (!req.body.token || req.body.token !== process.env.HTTP_TOKEN)
      return res.sendStatus(403);

    function getReqYearAndMonth(data) {
      if (data.year && data.month)
        return {year: parseInt(data.year), month: parseInt(data.month) - 1};
      let date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - 1);
      return {year: date.getFullYear(), month: date.getMonth()};
    }

    try {
      const context = await createMockContext();
      const channels = req.body.channels || (await Channels.getChannels()).map(c => c.folder);
      const {year, month} = getReqYearAndMonth(req.body);
      const yearMonthStr = `${year}${(month + 1).toString().padStart(2, '0')}`;
      const owner = process.env.REPO_OWNER;
      const repo = req.body.isTest ? process.env.TEST_REPO : process.env.REPO;
      const newBranch = `credits-${yearMonthStr}-${Math.floor(Math.random() * 100)}`;

      // TODO: Deduplicate pull creation code with index.js

      // Get hash of master branch
      const masterBranch = await context.github.repos.getBranch({
        owner: owner,
        repo: repo,
        branch: 'master'
      });
      const sha = masterBranch.data.commit.sha;

      // Create a new tree with new files, on top of master
      const newFiles = [];
      async function createContributionFile(channel) {
        const content = await createContributionTable(context, channel, year, month);
        newFiles.push({
          path: `rewards/${channel}/${yearMonthStr}.md`,
          mode: '100644',
          type: 'blob',
          content: content
        });
      }
      for (let channel of channels)
        await createContributionFile(channel);

      const newTree = await context.github.git.createTree({
        owner: owner,
        repo: repo,
        base_tree: sha,
        tree: newFiles,
      });

      // Commit the new tree
      const newCommit = await context.github.git.createCommit({
        owner: owner,
        repo: repo,
        message: `添加 ${year} 年 ${month + 1} 月贡献表`,
        tree: newTree.data.sha,
        parents: [sha],
      });

      // Create a new branch referring the commit
      const newRef = await context.github.git.createRef({
        owner: owner,
        repo: repo,
        ref: `refs/heads/${newBranch}`,
        sha: newCommit.data.sha,
      });

      // Create a new pull request
      const newPull = await context.github.pulls.create({
        owner: owner,
        repo: repo,
        title: `添加 ${year} 年 ${month + 1} 月贡献表`,
        head: newBranch,
        base: 'master',
        body: `添加 ${year} 年 ${month + 1} 月贡献表`,
        maintainer_can_modify: true,
      });

      res.send(`Created https://github.com/${owner}/${repo}/pulls/${newPull.data.number}`);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });
}

module.exports = {
  addRoute: addRoute,
  addRouteMarkdown: addRouteMarkdown,
  addRouteCreatePull: addRouteCreatePull
};
