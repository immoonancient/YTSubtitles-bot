const TestUtils = require('../test-utils.js');

beforeEach(TestUtils.beforeEachTest);
afterEach(TestUtils.afterEachTest);

test('New subtitle issue posted', async () => {
  const payload = require('../fixtures/issues_opened_1229');
  const repo = payload.repository.full_name;

  const interceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/labels`,
    200);

  TestUtils.createApp().receive({ name: 'issues', payload: payload });

  const labels = await interceptor;
  expect(labels).toEqual(['待翻译', '美食作家王刚']);
});

test('New non-subtitle issue posted', async () => {
  const payload = require('../fixtures/issues_opened_test_109');
  const repo = payload.repository.full_name;

  const interceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/labels`,
    200);

  TestUtils.createApp().receive({ name: 'issues', payload: payload });

  let labels;
  interceptor.then(resolved => labels = resolved);

  await TestUtils.timeout(2000);
  expect(labels).not.toBeTruthy();
});