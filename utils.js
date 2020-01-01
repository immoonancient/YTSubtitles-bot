const Channels = require('./channels.js');

const Utils = {};

async function getIssue(context, number) {
  const response = await context.github.issues.get(context.issue({issue_number: number}));
  return response.data;
}
Utils['getIssue'] = getIssue;

async function getReviews(context, pullNumber) {
  const result = [];
  for (let page = 1; ; ++page) {
    const response = await context.github.pulls.listReviews(context.issue({
      pull_number: pullNumber,
      per_page: 100,
      page: page
    }));
    result.push(...response.data);
    if (response.data.length < 100)
      break;
  }
  return result;
}
Utils['getReviews'] = getReviews;

// Returns whether the issue/pull is open or closed
async function isOpen(context, number) {
  const issue = await getIssue(context, number);
  return issue.state === 'open';
}
Utils['isOpen'] = isOpen;

// Returns all labels of an issue/pull
async function getAllLabels(context, number) {
  const issue = await getIssue(context, number);
  if (!issue.labels)
    return [];
  return issue.labels.map(label => label.name);
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
async function getSubtitleIssueNumber(context, pull) {
  if (!pull.number) {
    const number = pull;
    const pullResponse = await context.github.pulls.get(context.issue({number: number}));
    pull = pullResponse.data;
  }

  let result = null;
  result = await getSubtitleIssueNumberFromComment(context, pull.body);
  if (result)
    return result;
  const comments = await context.github.issues.listComments(context.issue({issue_number: pull.number}));
  for (let comment of comments.data) {
    result = getSubtitleIssueNumberFromComment(context, comment.body);
    if (result)
      return result;
  }
  return null;
}
Utils['getSubtitleIssueNumber'] = getSubtitleIssueNumber;

function getVideoURLFromTitle(title) {
  let re = /https:\/\/(youtu\.be\/|www\.youtube\.com\/watch\?v=)[A-Za-z0-9_\-]+/;
  let m = title.match(re);
  if (m)
    return m[0];
}
Utils['getVideoURLFromTitle'] = getVideoURLFromTitle;

module.exports = Utils;