const Channels = require('./channels.js');

const Utils = {};

// Returns whether the issue/pull is open or closed
async function isOpen(context, number) {
  const response = await context.github.issues.get(context.issue({number: number}));
  const result = (response.data.state === 'open');
  return result;
}
Utils['isOpen'] = isOpen;

// Returns all labels of an issue/pull
async function getAllLabels(context, number) {
  const response = await context.github.issues.listLabelsOnIssue(context.issue({number: number}));
  const result = [];
  response.data.forEach(item => result.push(item.name));
  return result;
}
Utils['getAllLabels'] = getAllLabels;

async function getChannel(context, number) {
  const labels = await getAllLabels(context, number);
  return Channels.findChannelFromLabels(labels);
}
Utils['getChannel'] = getChannel;

// Returns true if the pull request uploads a single file into a subdir
// of `/subtitles/` (e.g., `/subtitles/wang-gang/`)
async function isSubtitlePull(context, pullNumber) {
  const response = await context.github.pulls.listFiles(context.issue({number: pullNumber}));
  const files = response.data;
  if (files.length !== 1)
    return false;

  const filename = files[0].filename;
  if (!filename.startsWith('subtitles/'))
    return false;
  return filename.split('/').length === 3;
}
Utils['isSubtitlePull'] = isSubtitlePull;

async function getSubtitleIssueNumberFromComment(context, commentBody) {
  const regex = /#\d+/g;
  const matches = commentBody.match(regex);
  if (!matches)
    return null;
  for (let match of matches) {
    const number = parseInt(match.substring(1));
    if (await getChannel(context, number))
      return number;
  }
  return null;
}
Utils['getSubtitleIssueNumberFromComment'] = getSubtitleIssueNumberFromComment;

// Returns the first mentioned issue number in a pull request, such that
// the issue has a channel label
async function getSubtitleIssueNumber(context, pullNumber) {
  let result = null;
  const pull_details = await context.github.pulls.get(context.issue({number: pullNumber}));
  result = await getSubtitleIssueNumberFromComment(context, pull_details.data.body);
  if (result)
    return result;
  const comments = await context.github.issues.listComments(context.issue({number: pullNumber}));
  for (let comment of comments.data) {
    result = getSubtitleIssueNumberFromComment(context, comment.body);
    if (result)
      return result;
  }
  return null;
}
Utils['getSubtitleIssueNumber'] = getSubtitleIssueNumber;

module.exports = Utils;