const Express = require('express');

const Hinter = require('./hinter.js');
const Channels = require('./channels.js');
const Utils = require('./utils.js');
const Cheer = require('./cheer.js');
const Formatter = require('./formatter/formatter.js');

const Credits = require('./credits-generation.js');

const statusLabels = [
  '待翻译',
  '待审阅',
  '待上传',
  '待发布',
];

async function setStatusLabel(context, issueNumber, label) {
  await removeAllStatusLabels(context, issueNumber);
  context.github.issues.addLabels(context.issue({
    number: issueNumber,
    issue_number: issueNumber,
    labels: [label]
  }));
}

async function removeAllStatusLabels(context, issueNumber) {
  let labels = await Utils.getAllLabels(context, issueNumber);
  labels.filter(label => statusLabels.includes(label)).forEach(label => {
    context.github.issues.removeLabel(context.issue({
      number: issueNumber,
      issue_number: issueNumber,
      name: label
    }));
  });
}

function getSubtitleRequestBody(message) {
  function containsSubtitles(message) {
    return Formatter.testFormat(message);
  }

  const header = 'bot, please upload';
  if (message.startsWith(header))
    return message.substring(header.length);
  
  if (containsSubtitles(message))
    return message;

  return null;
}

async function addTranslationHints(context) {
  if (context.payload.issue.pull_request)
    return;
  const hinter = await Hinter.create();
  const body = context.payload.issue.body;
  const hints = hinter.getHints(body);
  if (!hints)
    return;
  const reply = ['对照翻译建议，根据[对译表](https://github.com/immoonancient/YTSubtitles/blob/master/docs/translation-table.md)生成', ''];
  for (let hint in hints)
    reply.push(`${hint}: ${hints[hint]}`);
  const parameters = context.issue({body: reply.join('\n')});
  console.log(parameters);
  context.github.issues.createComment(parameters);
}

module.exports = app => {
  // Channel and "待翻译" to new issues
  // Also add translation hints
  app.on('issues.opened', async context => {
    addTranslationHints(context);

    const title = context.payload.issue.title;
    const channel = Channels.findChannelFromTitle(title);
    if (!channel)
      return;
    const labels = ['待翻译', channel.label];
    context.github.issues.addLabels(context.issue({labels: labels}));
  });

  // When a pull request is opened, and it (1) is a subtitle upload, and (2) mentions an issue when opened,
  // (3) the issue is open and contains a channel label, then (a) apply channel label to pull request,
  // and (b) apply "待审阅" label to issue
  app.on('pull_request.opened', async context => {
    const pull = context.payload.pull_request;
    if (!await Utils.isSubtitlePull(context, pull.number))
      return;
    const issueNumber = await Utils.getSubtitleIssueNumberFromComment(context, pull.body);
    if (!issueNumber)
      return;
    if (!await Utils.isOpen(context, issueNumber))
      return;
    const channel = await Utils.getChannel(context, issueNumber);
    if (!channel)
      return;
    await setStatusLabel(context, issueNumber, '待审阅');
    context.github.issues.addLabels(context.issue({number: pull.number, labels: [channel.label]}));
  });

  app.on('issue_comment.created', async context => {
    if (context.payload.issue.state !== 'open')
      return;
    if (!context.payload.issue.pull_request)
      return;
    const pull = context.payload.issue;
    if (!await Utils.isSubtitlePull(context, pull.number))
      return;

    // When a pull request comment is added, and it (i) belongs to a subtitle upload, and (2) firstly mentions
    // an issue in the pull request, and (3) the issue is open and contains a channel label, then
    // (a) apply channel label to pull request, and (b) apply "待审阅" label to issue
    async function linkPullRequestToSubtitleIssueIfNeeded() {
      const issueNumber = await Utils.getSubtitleIssueNumberFromComment(context, context.payload.comment.body);
      if (!issueNumber)
        return;
      if (!await Utils.isOpen(context, issueNumber))
        return;
      const channel = await Utils.getChannel(context, issueNumber);
      if (!channel)
        return;
      await setStatusLabel(context, issueNumber, '待审阅');
      await context.github.issues.addLabels(context.issue({number: pull.number, labels: [channel.label]}));
    };
    linkPullRequestToSubtitleIssueIfNeeded();

    // "bot, please format" command
    async function botPleaseFormat() {
      const body = context.payload.comment.body.trim();
      if (!body.startsWith('bot, please format'))
        return;
      console.log('"bot, please upload" command detected');
      const issueNumber = await Utils.getSubtitleIssueNumber(context, pull);
      if (!issueNumber) {
        console.log(`Pull request #${pull.number} not linked to subtitle issue yet`);
        return;
      }
      const issue = await Utils.getIssue(context, issueNumber);
      if (!issue) {
        console.log(`Failed getting issue #${issueNumber}`);
        return;
      }
      const subtitles = await Utils.getSubtitleFileContent(context, pull);
      if (!subtitles) {
        console.log(`Failed getting subtitle file content from #${pull.number}`);
        return;
      }
      const url = Utils.getVideoURLFromTitle(issue.title) || 'https://youtu.be/XXXXXXXXXXX';
      const formatted = Formatter.format(subtitles, url).join('\n');
      context.github.issues.createComment(context.issue({
        body: 'I suggest formatting the subtitles as follows\n```\n' + formatted + '\n```'
      }));
    };
    botPleaseFormat();
  });

  // When a pull request is merged, and it (1) is a subtitle upload, (2) mentions an open issue with a
  // channel label, then (a) apply "待上传" label to issue
  app.on('pull_request.closed', async context => {
    const pull = context.payload.pull_request;
    if (!pull.merged)
      return;
    const path = await Utils.getSubtitleFilePath(context, pull.number);
    if (!path)
      return;
    const issueNumber = await Utils.getSubtitleIssueNumber(context, pull.number);
    if (!issueNumber)
      return;
    const issue = await Utils.getIssue(context, issueNumber);
    if (!issue || issue.state !== 'open')
      return;
    if (!Channels.findChannelFromLabels(issue.labels.map(label => label.name)))
      return;
    if (!issue.assignee)
      return;
    await setStatusLabel(context, issueNumber, '待上传');

    const uploaderURL = 'https://immoonancient.github.io/YTSubtitles/static/uploader.html';
    const videoID = Utils.getVideoIDFromTitle(issue.title) || '';

    await context.github.issues.createComment(context.issue({
      issue_number: issueNumber,
      body: [
        Cheer(issue.assignee.login),
        '',
        `Please upload the subtitles to YouTube via ${uploaderURL}?video=${videoID}&path=${encodeURIComponent(path.substring('subtitles/'.length))}`
      ].join('\n')}));
  });

  // When the assignee replies to a subtitle issue, and the comment body starts with 'bot, please upload'
  // followed by the subtitles to be uploaded,
  // 1. Creates a pull request that adds a single file with the subtitles as file content
  // 2. Replies to the issue and folds the subtitles in the previous comment
  app.on('issue_comment.created', async context => {
    if (context.payload.issue.pull_request)
      return;
    if (!context.payload.issue.assignee)
      return;
    const author = context.payload.sender;
    if (author.id !== context.payload.issue.assignee.id)
      return;
    if (!context.payload.issue.labels)
      return;
    const labels = context.payload.issue.labels.map(label => label.name);
    const channel = Channels.findChannelFromLabels(labels);
    if (!channel)
      return;
    const channelLabel = channel.label;
    const channelFolder = channel.folder;
    const comment = context.payload.comment.body;
    const raw_subtitles = getSubtitleRequestBody(comment);
    if (!raw_subtitles)
      return;
    const url = Utils.getVideoURLFromTitle(context.payload.issue.title) || 'https://youtu.be/XXXXXXXXXXX';

    // There's some duplicated work here, but who cares
    const format = Formatter.testFormat(raw_subtitles);
    const subtitles = Formatter.format(raw_subtitles, url).join('\n') + '\n';

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const issueNumber = context.payload.issue.number;
    const newBranch = `issue-${issueNumber}-${Math.floor(Math.random() * 100)}`;

    // Get hash of master branch
    const masterBranch = await context.github.repos.getBranch({
      owner: owner,
      repo: repo,
      branch: 'master'
    });
    const sha = masterBranch.data.commit.sha;

    // Create a new tree with a new file, on top of master
    const date = new Date();
    const dateStamp = [
      date.getFullYear(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      date.getDate().toString().padStart(2, '0')
    ].join('');
    const newFileName = Utils.mainTitleToPinyin(context.payload.issue.title) || `subtitles-issue-${issueNumber}`;
    const newFileFullName = `${dateStamp}-${newFileName}${format ? ('.' + format) : ''}`;
    const newFile = {
      path: `subtitles/${channelFolder}/${newFileFullName}`,
      mode: '100644',
      type: 'blob',
      content: subtitles
    };
    const newTree = await context.github.git.createTree({
      owner: owner,
      repo: repo,
      base_tree: sha,
      tree: [newFile],
    });

    const commitAuthor = {
      name: author.login,
      email: author.email || `${author.id}+${author.login}@users.noreply.github.com`
    };

    // TODO: Try not to hard code it.
    const committer = {
      name: 'ytsubtitles-bot[bot]',
      email: '56288348+ytsubtitles-bot[bot]@users.noreply.github.com'
    };

    // Commit the new tree
    const newCommit = await context.github.git.createCommit({
      owner: owner,
      repo: repo,
      message: `Upload subtitles for issue #${issueNumber} on behalf of @${author.login}`,
      tree: newTree.data.sha,
      parents: [sha],
      author: commitAuthor,
      committer: committer
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
      title: context.payload.issue.title,
      head: newBranch,
      base: 'master',
      body: `#${issueNumber}\n\nUploaded on behalf of @${author.login}`,
      maintainer_can_modify: true,
    });

    // Edit the original issue comment to collapse the subtitles
    const codequote = '```';
    const editedComment = await context.github.issues.updateComment({
      owner: owner,
      repo: repo,
      comment_id: context.payload.comment.id,
      body: `bot, please upload\n\n<details><summary>Subtitles uploaded as pull request</summary>${codequote}\n${subtitles}\n${codequote}</details>`
    });

    // Post a comment to the issue to notify pull request creation
    const newComment = await context.github.issues.createComment(context.issue({
      body: `@${author.login}, I've formatted and uploaded your subtitles as #${newPull.data.number}.`
    }));
  });

  // ====== HTTP routes ======

  const router = app.route('/tools');
  const express = Express.json();
  router.use(express);

  Channels.addListChannelRoute(router, '/list-channels')
  Credits.addRoute(router, '/credits');
  Formatter.addRoute(router, '/format');
}
