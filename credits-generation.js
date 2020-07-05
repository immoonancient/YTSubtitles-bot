require('dotenv').config();

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

async function getContributionList(channel, startDate, endDate) {
  console.log(`getContributionList(${channel.folder}, ${startDate}, ${endDate})`);

  function createQueryString(hasCursor) {
    return `
    query subtitleIssues($channel: String!, $pageSize: Int!, ${hasCursor ? "$cursor: String!" : ""}) {
      repository(owner: "immoonancient", name: "YTSubtitles") {
        pullRequests(labels: [$channel], last: $pageSize, ${hasCursor ? "before: $cursor" : ""}) {
          pageInfo {
            startCursor
            hasPreviousPage
          }
          nodes {
            title
            number
            merged
            createdAt
            reviews(last: 100) {
              pageInfo {
                startCursor
                hasPreviousPage
              }
              nodes {
                author {
                  login
                }
                state
                comments(last: 10) {
                  totalCount
                }
              }
            }
            timelineItems(itemTypes: [CROSS_REFERENCED_EVENT], last: 20){
              pageInfo {
                startCursor
                hasPreviousPage
              }
              nodes {
                ... on CrossReferencedEvent {
                  referencedAt
                  source {
                    ... on Issue {
                      number
                      title
                      labels(last: 5) {
                        pageInfo {
                          hasPreviousPage
                        }
                        nodes {
                          name
                        }
                      }
                      assignees(last: 5) {
                        pageInfo {
                          hasPreviousPage
                        }
                        nodes {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    `;
  }

  const graphql = require('./auth.js').graphqlWithAuth();

  const { repository } = await graphql({
    query: createQueryString(false),
    channel: channel.label,
    pageSize: 20,
  });

  while (repository.pullRequests.pageInfo.hasPreviousPage &&
         new Date(repository.pullRequests.nodes[0].createdAt) >= startDate) {
    const previousPage = await graphql({
      query: createQueryString(true),
      channel: channel.label,
      pageSize: 20,
      cursor: repository.pullRequests.pageInfo.startCursor,
    });

    repository.pullRequests.pageInfo = previousPage.repository.pullRequests.pageInfo;
    repository.pullRequests.nodes.splice(0, 0, ...previousPage.repository.pullRequests.nodes);
  }

  const pulls = repository.pullRequests.nodes.filter(pull => {
    const createdAt = new Date(pull.createdAt);
    if (createdAt < startDate || createdAt >= endDate)
      return false;
    if (!pull.reviews || !pull.reviews.nodes.length)
      return false;
    if (!pull.merged)
      return false;
    pull.timelineItems.nodes = pull.timelineItems.nodes
      .filter(item => {
        if (!item.source || !item.source.number)
          return false;
        const issue = item.source;
        if (!issue.labels || !issue.labels.nodes.some(label => label.name === channel.label))
          return false;
        return true;
      });
    if (!pull.timelineItems.nodes.length) {
      console.log(`Failed to find matching issue number for pull request #${pull.number}`);
      return false;
    }
    pull.issue = pull.timelineItems.nodes[0].source;
    if (!pull.issue.assignees.nodes.length) {
      console.log(`Pull request #${pull.number} matches issue #${pull.issue.number} but no one is assigned`);
      return false;
    }
    return true;
  });

  for (let pull of pulls) {
    pull.reviews.nodes = pull.reviews.nodes
      // Combine multiple reviews of the same author
      .reduce(
        (accumulated, review) => {
          const found = accumulated.find(rev => rev.author.login == review.author.login);
          if (found) {
            if (review.state !== 'COMMENTED')
              found.state = review.state;
            found.comments.totalCount += review.comments.totalCount;
            return accumulated;
          }
          accumulated.push(review);
          return accumulated;
        },
        []
      )
      .filter(review => {
        const name = review.author.login;
        // Subtitle authors cannot review their their own pull requests
        if (pull.issue.assignees.nodes.some(assignee => assignee.login == name))
          return false;
        // Approvals and changes needed are valid reviews
        if (review.state !== 'COMMENTED')
          return true;
        // Repo owner sometimes does some trivial modifications like formatting
        // Discard his reviews if he didn't explicit state approval
        if (name === process.env.REPO_OWNER)
          return false;
        // A rough heuristic: someone with >= 5 comments on a pull request counts as a review
        if (review.comments && review.comments.totalCount >= 5)
          return true;
        console.log(`User @${name} commented on #${pull.number} but doesn't count`);
        return false;
      });
  }

  const contributions = {};
  for (let pull of pulls) {
    console.log(`Pull #${pull.number} matches issue #${pull.issue.number}`)

    for (let assignee of pull.issue.assignees.nodes) {
      const name = assignee.login;
      contributions[name] = contributions[name] || new Contribution(name);
      contributions[name].addTranslation(pull.issue.number);
    }

    for (let review of pull.reviews.nodes) {
      const name = review.author.login;
      contributions[name] = contributions[name] || new Contribution(name);
      contributions[name].addReview(pull.number);
    }
  }

  const contributionList = Object.keys(contributions).map(name => contributions[name]);

  contributionList.sort((c1, c2) => c2.countContributions() - c1.countContributions());

  return contributionList;
}

// Note: monthIndex is 0-based, i.e., January is 0, not 1
async function createContributionTable(channelName, year, monthIndex) {
  console.log(`createContributionTable(${channelName}, ${year}, ${monthIndex})`);

  const channel = await Channels.findChannelFromFolder(channelName);
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

function addRouteMarkdown(router, path) {
  router.get(path, async(req, res) => {
    const query = req.query;
    if (!query['channel'] || !query['year'] || !query['month']) {
      res.sendStatus(400);
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(await createContributionTable(
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
        const content = await createContributionTable(channel, year, month);
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
