const Hinter = require('./hinter.js');
const Channels = require('./channels.js');
const Utils = require('./utils.js');

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
  // TODO: make the pattern matching more versatile
  const header = 'bot, please upload';
  if (!message.startsWith(header))
    return null;
  return message.substring(header.length);
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

  // When a pull request comment is added, and it (i) belongs to a subtitle upload, and (2) firstly mentions
  // an issue in the pull request, and (3) the issue is open and contains a channel label, then
  // (a) apply channel label to pull request, and (b) apply "待审阅" label to issue
  app.on('issue_comment.created', async context => {
    if (context.payload.issue.state !== 'open')
      return;
    if (!context.payload.issue.pull_request)
      return;
    const pull = context.payload.issue;
    if (!await Utils.isSubtitlePull(context, pull.number))
      return;
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
  });

  // When a pull request is merged, and it (1) is a subtitle upload, (2) mentions an open issue with a
  // channel label, then (a) apply "待上传" label to issue
  app.on('pull_request.closed', async context => {
    const pull = context.payload.pull_request;
    if (!pull.merged)
      return;
    if (!await Utils.isSubtitlePull(context, pull.number))
      return;
    const issueNumber = await Utils.getSubtitleIssueNumber(context, pull.number);
    if (!issueNumber)
      return;
    if (!await Utils.isOpen(context, issueNumber))
      return;
    if (!await Utils.getChannel(context, issueNumber))
      return;
    await setStatusLabel(context, issueNumber, '待上传');
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
    const subtitles = getSubtitleRequestBody(comment);
    if (!subtitles)
      return;

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
    const newFileName = `subtitles-issue-${issueNumber}`; // TODO: improve this
    const newFile = {
      path: `subtitles/${channelFolder}/${newFileName}`,
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

    // Commit the new tree
    // TODO: Set author correctly
    const newCommit = await context.github.git.createCommit({
      owner: owner,
      repo: repo,
      message: `Upload subtitles for issue #${issueNumber} on behalf of @${author.login}`,
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
      body: `@${author.login}, I've uploaded your subtitles as #${newPull.data.number}.`
    }));
  });

}
