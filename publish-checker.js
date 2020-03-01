require('dotenv').config();

const Channels = require('./channels.js');
const Utils = require('./utils.js');

async function updateSubtitleIssueStatus() {
  const Auth = require('./auth.js');
  const octokit = await Auth();
  const youtube = await require('./youtube-utils.js')();

  async function handleIssue(issue) {
    async function manageIssue(method, extraOptions) {
      console.log({issue: issue.number, method: method, extraOptions: extraOptions});
      const options = {
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        issue_number: issue.number
      };
      if (extraOptions)
        Object.assign(options, extraOptions);
      await octokit.issues[method](options);
    }

    async function getNeedsUploadLabeledTimestamp() {
      const options = octokit.issues.listEvents.endpoint.merge({
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        issue_number: issue.number  
      });
      let result;
      await octokit.paginate(options, response => {
        response.data.map(event => {
          if (event.event !== 'labeled')
            return;
          if (event.label.name === '待上传' ||
              (event.labels && event.labels.some(label => label.name === '待上传'))) {
            const timestamp = new Date(event.created_at);
            if (!result || timestamp > result)
              result = timestamp;
          }
        });
      });
      return result;
    }

    // 'none', 'uploaded', ''
    async function checkIssuePublishStatus() {
      const videoId = Utils.getVideoIDFromTitle(issue.title);
      const caption = await youtube.getCaptionSummary(videoId, 'en');
      if (!caption)
        return 'none';
      // TODO: Handle the "uploaded" status correctly
      if (caption.snippet.status !== 'serving' || caption.snippet.isDraft)
        return 'none';
      const timestamp = await getNeedsUploadLabeledTimestamp();
      if (!timestamp) {
        console.log(`Can't find 待发布 label timestamp on issue #${issue.number}`);
        return 'none';
      }
      console.log(`待发布 label of issue #${issue.number} added at ${timestamp.toString()}`);
      const captionTimestamp = new Date(caption.snippet.lastUpdated);
      console.log(`YouTube caption of video ${videoId} was last updated at ${captionTimestamp.toString()}`);
      if (captionTimestamp > timestamp)
        return 'published';
      return 'none';
    }

    async function handleAwaitUploadIssue() {
      console.log('handleAwaitUploadIssue #' + issue.number);
      const status = await checkIssuePublishStatus(issue);
      if (status === 'none')
        return;
        
      await manageIssue('removeLabel', {name: '待上传'});

      if (status === 'uploaded') {
        await manageIssue('addLabels', {labels: ['待发布']});
        return;
      }

      // status === 'published'
      await manageIssue('createComment', {body: '已发布'});
      await manageIssue('update', {state: 'closed'});
    }

    async function handleAwaitPublishIssue() {
      console.log('handleAwaitPublishIssue #' + issue.number); 
      const status = await checkIssuePublishStatus(issue);
      if (status !== 'published')
        return;

      await manageIssue('removeLabel', {name: '待发布'});
      await manageIssue('createComment', {body: '已发布'});
      await manageIssue('update', {state: 'closed'});
    }

    if (!Channels.findChannelFromLabels(issue.labels.map(label => label.name)))
      return;
    const url = Utils.getVideoURLFromTitle(issue.title);
    if (!url)
      return;
    if (issue.labels.some(label => label.name === '待上传'))
      await handleAwaitUploadIssue(issue);
    else if (issue.labels.some(label => label.name === '待发布'))
      await handleAwaitPublishIssue(issue);
  }

  async function handleAllOpenSubtitleIssues() {
    const options = octokit.issues.listForRepo.endpoint.merge({
          owner: process.env.REPO_OWNER,
          repo: process.env.REPO,
          state: 'open',
          assignee: '*'});
    await octokit.paginate(options, response => {
      Promise.all(response.data.map(issue => handleIssue(issue)));
    });
  }

  await handleAllOpenSubtitleIssues();
}

function addRoute(router, path) {
  router.post(path, async (req, res) => {
    await updateSubtitleIssueStatus();
    res.sendStatus(200);
  });
}

module.exports = {
  addRoute: addRoute
};