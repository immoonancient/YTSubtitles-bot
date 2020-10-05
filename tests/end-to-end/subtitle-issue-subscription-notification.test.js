const TestUtils = require('../test-utils.js');
const Channels = require('../../channels.js');

beforeEach(() => {
  TestUtils.beforeEachTest();

  // The test is pretty slow as it involves many iterations of HTTP requests.
  jest.setTimeout(30000);
});

afterEach(TestUtils.afterEachTest);

test('Notify subscribers when subscription_issue is provided', async () => {
  const payload = require('../fixtures/issues_labeled_test_64.json');
  const repo = payload.repository.full_name;
  const label = payload.label.name;
  const channel = await Channels.findChannelFromLabels([label]);

  expect(channel).toBeTruthy();
  expect(channel.subscriptionIssue).toBeTruthy();

  const hints = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/comments`,
    200);

  const interceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${channel.subscriptionIssue}/comments`,
    200);

  TestUtils.createApp().receive({ name: 'issues', payload: payload });

  const hintsText = await hints;
  expect(hintsText.body).toBeTruthy();

  const expected = [
    '求翻译',
    '',
    '```',
    payload.issue.title,
    '```',
    `详情见 #${payload.issue.number}`,
  ].join('\n');
  const notified = await interceptor;
  expect(notified).toMatchObject({ body: expected });
});

test('Don\'t notify subscribers when no subscription_issue is provided', async () => {
  const payload = require('../fixtures/issues_labeled_test_90.json');
  const repo = payload.repository.full_name;
  const label = payload.label.name;
  const channel = await Channels.findChannelFromLabels([label]);

  expect(channel).toBeTruthy();
  expect(channel.subscriptionIssue).not.toBeTruthy();

  const hints = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/comments`,
    200);

  TestUtils.createApp().receive({ name: 'issues', payload: payload });

  const hintsText = await hints;
  expect(hintsText.body).toBeTruthy();

  await TestUtils.timeout(3000);

  // There should not be un-intercepted HTTP requests posting comments at other issues
});
