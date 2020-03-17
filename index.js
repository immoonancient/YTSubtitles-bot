const Express = require('express');

const Hinter = require('./hinter.js');
const Channels = require('./channels.js');
const Utils = require('./utils.js');
const Cheer = require('./cheer.js');
const Formatter = require('./formatter/formatter.js');

const Credits = require('./credits-generation.js');

const PublishChecker = require('./publish-checker.js');

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

module.exports = app => {
  // Channel and "待翻译" to new issues
  app.on('issues.opened', async context => {
    const title = context.payload.issue.title;
    const channel = Channels.findChannelFromTitle(title);
    if (!channel)
      return;
    const labels = ['待翻译', channel.label];
    context.github.issues.addLabels(context.issue({labels: labels}));
  });

  // Post translation hints if needed
  app.on('issues.labeled', async context => {
    if (context.payload.issue.pull_request)
      return;
    const label = context.payload.label.name;
    const channel = Channels.findChannelFromLabels([label]);
    if (!channel)
      return;
    const hinter = await Hinter.create();
    const body = context.payload.issue.body;
    const hints = hinter.getHints(body, channel.folder);
    if (!hints)
      return;
    const reply = ['以下为部分词汇翻译提示，根据[对译表](https://immoonancient.github.io/YTSubtitles/static/translation-table.html)生成', ''];
    reply.push('| 中文 | English | 备注 |');
    reply.push('| ---- | ------- | ---- |');
    for (let hint in hints) {
      for (let term of hints[hint]) {
        reply.push(`| ${term.cn} | ${term.en} | ${term.notes || ''} |`);
      }
    }
    context.github.issues.createComment(context.issue({body: reply.join('\n')}));
  });

  // Post translation hints if needed
  app.on('issue_comment.created', async context => {
    if (context.payload.comment.body !== 'bot, please hint')
      return;
    if (context.payload.issue.pull_request)
      return;
    const labels = context.payload.issue.labels.map(label => label.name);
    const channel = Channels.findChannelFromLabels(labels);
    if (!channel)
      return;
    const hinter = await Hinter.create();
    const body = context.payload.issue.body;
    const hints = hinter.getHints(body, channel.folder);
    if (!hints)
      return;
    const reply = ['以下为部分词汇翻译提示，根据[对译表](https://immoonancient.github.io/YTSubtitles/static/translation-table.html)生成', ''];
    reply.push('| 中文 | English | 备注 |');
    reply.push('| ---- | ------- | ---- |');
    for (let hint in hints) {
      for (let term of hints[hint]) {
        reply.push(`| ${term.cn} | ${term.en} | ${term.notes || ''} |`);
      }
    }
    context.github.issues.createComment(context.issue({body: reply.join('\n')}));
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

  // When someone replies '认领' in a subtitle issue without assignee, assign them and prompt the next steps
  app.on('issue_comment.created', async context => {
    const body = context.payload.comment.body.trim();
    if (body !== '认领')
      return;

    function respond(body) {
      context.github.issues.createComment(context.issue({body: body}));
    }

    const issue = context.payload.issue;
    if (issue.state !== "open")
      return respond('Issue 已关闭，不能认领了');
    if (issue.assignee)
      return respond('Issue 已经被认领了，不能重复认领');
    const channel = Channels.findChannelFromLabels(issue.labels.map(label => label.name));
    if (!channel)
      return respond('不能认领非字幕 issue');
    if (!Utils.getVideoIDFromTitle(context.payload.issue.title))
      return respond('不能认领非字幕 issue');

    const user = context.payload.comment.user.login;
    context.github.issues.addAssignees(context.issue({assignees: [user]}));
  });

  // When someone gets assigned to a subtitle issue, prompt next steps
  app.on('issues.assigned', async context => {
    const issue = context.payload.issue;
    if (issue.state !== "open")
      return;
    const channel = Channels.findChannelFromLabels(issue.labels.map(label => label.name));
    if (!channel)
      return;
    if (!Utils.getVideoIDFromTitle(context.payload.issue.title))
      return;

    const user = context.payload.assignee.login;
    const body = [
      `@${user} 谢谢认领！请在 48 小时内完成翻译。`,
      '',
      '完成翻译后，请将完整稿件复制并回复到本 issue。',
      [
        '参考:',
        '[翻译及投稿步骤](../blob/master/tutorial/upload-subtitles-new.md)',
        '[翻译守则](../blob/master/docs/guidelines.md#翻译守则)',
        `[往期翻译](../blob/master/subtitles/${channel.folder}/)`
      ].join(' ')
    ].join('\n');
    context.github.issues.createComment(context.issue({body: body}));
  });

  // When someone looks like trying to be assigned, prompt them to reply '认领'
  app.on('issue_comment.created', async context => {
    function mayBeAssignAttempt(comment) {
      if (context.payload.sender.type === 'Bot')
        return false;
      if (comment === '认领')
        return false;
      if (comment.length > 100)
        return false;
      if (comment.length < 4)
        return true;
      if (comment.indexOf('认领') !== -1 &&
          context.payload.sender.id !== context.payload.repository.owner.id)
        return true;
      return false;
    }
    const body = context.payload.comment.body.trim();
    if (!mayBeAssignAttempt(body))
      return;

    const issue = context.payload.issue;
    if (issue.state !== "open")
      return;
    if (issue.assignee)
      return;
    if (!Channels.findChannelFromLabels(issue.labels.map(label => label.name)))
      return;

    function respond(body) {
      context.github.issues.createComment(context.issue({body: body}));
    }

    const user = context.payload.comment.user.login;
    respond(`@${user} 如果想要认领 issue, 请回复“认领”两个字（不包含引号）`);
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
    function respond(body) {
      context.github.issues.createComment(context.issue({body: body}));
    }

    function getSubtitleRequestBody(payload) {
      const sender = payload.sender;
      const assignee = payload.issue.assignee;
      const comment = payload.comment.body;

      {
        // bot, please upload on behalf of the assignee (owner only)
        const header = 'bot, please upload on behalf of the assignee';
        if (comment.startsWith(header)) {
          if (!assignee)
            throw new Error('本 issue 尚未有人认领，无法交稿');
          if (sender.id !== assignee.id && sender.id !== payload.repository.owner.id)
            throw new Error('只有管理员可以代替其他组员交稿');
          return comment.substring(header.length);
        }
      }

      // bot, please upload (assignee only)
      {
        const header = 'bot, please upload';
        if (comment.startsWith(header)) {
          if (!assignee)
            throw new Error(`@${sender.login} 请先认领后再交稿。认领方法为回复“认领”二字（不包含引号）`);
          if (sender.id !== assignee.id)
            throw new Error(`@${sender.login} 只有本 issue 的认领者才能这样交稿`);
          return comment.substring(header.length);
        }
      }

      // (no explicit command, asignee only)
      function containsSubtitles(message) {
        return Formatter.testFormat(message);
      }
      if (containsSubtitles(comment)) {
          if (!assignee)
            throw new Error(`@${sender.login} 请先认领后再交稿。认领方法为回复“认领”二字（不包含引号）`);
          if (sender.id !== assignee.id)
            throw new Error(`@${sender.login} 只有本 issue 的认领者才能这样交稿`);
          return comment;
      }
    }

    if (context.payload.issue.pull_request)
      return;
    if (!context.payload.issue.labels)
      return;

    const labels = context.payload.issue.labels.map(label => label.name);
    const channel = Channels.findChannelFromLabels(labels);
    if (!channel)
      return;
    const channelLabel = channel.label;
    const channelFolder = channel.folder;

    let raw_subtitles;
    try {
      raw_subtitles = getSubtitleRequestBody(context.payload);
    } catch (error) {
      respond(error.message);
      return;
    }

    if (!raw_subtitles)
      return;

    const author = context.payload.issue.assignee;
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
  PublishChecker.addRoute(router, '/check-publish');
}
