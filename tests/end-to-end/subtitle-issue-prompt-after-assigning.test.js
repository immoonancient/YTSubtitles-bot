const TestUtils = require('../test-utils.js');

beforeEach(TestUtils.beforeEachTest);
afterEach(TestUtils.afterEachTest);

test('Prompt with next steps and docs after subtitle issue is assigned', async () => {
  const payload = require('../fixtures/issues_assigned_1541');
  const repo = payload.repository.full_name;

  const interceptor = TestUtils.intercept(
    'https://api.github.com',
    'post',
    `/repos/${repo}/issues/${payload.issue.number}/comments`,
    200);

  TestUtils.createApp().receive({ name: 'issues', payload: payload });

  const response = await interceptor;
  const rootPath = `https://github.com/immoonancient/YTSubtitles/blob/master`;
  const channel = await require('../../channels.js').findChannelFromTitle(payload.issue.title);
  expect(response).toEqual({body: [
      `@${payload.issue.assignee.login} 谢谢认领！请在 48 小时内完成翻译。`,
      '',
      '完成翻译后，请将完整稿件复制并回复到本 issue。',
      [
        '参考:',
        `[翻译及投稿步骤](${rootPath}/tutorial/upload-subtitles-new.md)`,
        `[翻译守则](${rootPath}/docs/guidelines.md#翻译守则)`,
        `[往期翻译](${rootPath}/subtitles/${channel.folder}/)`
      ].join(' ')
    ].join('\n')});
});
