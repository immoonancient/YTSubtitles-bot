const TestUtils = require('../test-utils.js');

beforeEach(TestUtils.beforeEachTest);
afterEach(TestUtils.afterEachTest);

test('Assign subtitle issue from comment when not assigned', async () => {
  const payload = require('../fixtures/issue_comment_created_test_653712135');
  const repo = payload.repository.full_name;

  const interceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/assignees`,
    200);

  TestUtils.createApp().receive({ name: 'issue_comment', payload: payload });

  const assignees = await interceptor;
  expect(assignees).toEqual({assignees: ['immoonancient']});
});

test('Do not assign subtitle issue from comment when already assigned', async () => {
  const payload = require('../fixtures/issue_comment_created_test_653713254');
  const repo = payload.repository.full_name;

  const assignInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/assignees`,
    200);

  const commentInterceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/comments`,
    200);

  TestUtils.createApp().receive({ name: 'issue_comment', payload: payload });

  let assignees;
  assignInterceptor.then(resolved => assignees = resolved);

  const response = await commentInterceptor;
  
  expect(assignees).not.toBeTruthy();
  expect(response).toEqual({ body: 'Issue 已经被认领了，不能重复认领' });
});
