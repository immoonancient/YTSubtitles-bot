const TestUtils = require('../test-utils.js');
const Channels = require('../../channels.js');

beforeEach(() => {
  TestUtils.beforeEachTest();

  // The test is pretty slow as it involves many iterations of HTTP requests.
  jest.setTimeout(30000);
});

afterEach(TestUtils.afterEachTest);

test('Submit subtitles via comment', async () => {
  const payload = require('../fixtures/issue_comment_created_653315086');
  const repo = payload.repository.full_name;

  const oldSHA = '965789C1559C12BCAA1F05CA61DFBFFEED070AAD';
  TestUtils.intercept(
    'https://api.github.com',
    'get',
    `/repos/${repo}/branches/master`,
    200,
    {
      name: 'master',
      commit: { sha: oldSHA },
    });

  const newSHA = 'A7EC51192375A0B2E8D20A048A795C6DA264D778';
  const newTreeInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/git/trees`,
    200,
    { sha: newSHA });

  const newCommitInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/git/commits`,
    200,
    { sha: newSHA });

  const newBranchInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/git/refs`,
    200);

  const newPullNumber = 9999;
  const newPullInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/pulls`,
    200,
    { number: newPullNumber });

  const reviewRequestInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/pulls/${newPullNumber}/requested_reviewers`,
    200);

  TestUtils.intercept(
    'https://api.github.com',
    'patch',
    `/repos/${repo}/issues/comments/${payload.comment.id}`,
    200);

  const replyCommentInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/comments`,
    200);

  TestUtils.createApp().receive({ name: 'issue_comment', payload: payload});

  const newTree = await newTreeInterceptor;
  expect(newTree).toMatchObject({
    base_tree: oldSHA,
    tree: [
      {
        path: expect.stringMatching(/^subtitles\/lao-fan-gu\/\d\d\d\d\d\d\d\d-lao-cu-hua-sheng.srt$/),
        mode: '100644',
        type: 'blob',
      }
    ]
  });

  const newCommit = await newCommitInterceptor;
  expect(newCommit).toMatchObject({
    message: `Upload subtitles for issue #${payload.issue.number} on behalf of @${payload.sender.login}`,
    tree: newSHA,
    parents: [oldSHA],
    author: { name: payload.sender.login },
    committer: { name: expect.stringMatching('bot') },
  });

  const newPull = await newPullInterceptor;
  expect(newPull).toMatchObject({
    base: 'master',
    head: expect.stringMatching(new RegExp(`^issue-${payload.issue.number}-\\d+$`)),
    title: payload.issue.title,
    body: `#${payload.issue.number}\n\nUploaded on behalf of @${payload.sender.login}`,
  });

  const expectedReviewers = (await Channels.findChannelFromFolder('lao-fan-gu')).reviewers;
  const reviewRequest = await reviewRequestInterceptor;
  expect(reviewRequest).toMatchObject({
    reviewers: expect.arrayContaining(expectedReviewers)
  });

  const replyComment = await replyCommentInterceptor;
  expect(replyComment).toMatchObject({
    body: expect.stringMatching(new RegExp(`uploaded your subtitles as #${newPullNumber}`)),
  });
});