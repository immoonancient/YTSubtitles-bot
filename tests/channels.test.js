const TestUtils = require('./test-utils.js');
const Channels = require('../channels.js');

beforeEach(TestUtils.beforeEachTest);
afterEach(TestUtils.afterEachTest);

test('findChannelFromTitle() #1229', async () => {
  const title = '【美食作家王刚】后厨的深度清洁 - https://youtu.be/ggnKS91ExwA';
  const channel = await Channels.findChannelFromTitle(title);
  expect(channel).toBeTruthy();
  expect(channel.label).toEqual('美食作家王刚');
  expect(channel.folder).toEqual('wang-gang');
});

test('findChannelFromTitle() #1226', async () => {
  const title = '[胖鱼] 糯米饭 - https://www.youtube.com/watch?v=tXkPlsKWDms';
  const channel = await Channels.findChannelFromTitle(title);
  expect(channel).toBeTruthy();
  expect(channel.label).toEqual('雪鱼探店');
  expect(channel.folder).toEqual('xue-yu');
});

test('findChannelFromTitle() #1063', async() => {
  const title = '新频道翻译投票贴';
  const channel = await Channels.findChannelFromTitle(title);
  expect(channel).not.toBeTruthy();
});

test('findChannelFromLabels() #1229', async () => {
  const labels = ['美食作家王刚', '待审阅'];
  const channel = await Channels.findChannelFromLabels(labels);
  expect(channel).toBeTruthy();
  expect(channel.label).toEqual('美食作家王刚');
  expect(channel.folder).toEqual('wang-gang');
});

test('findChannelFromFolder()', async () => {
  const folders = ['wang-gang', 'xue-yu', 'lao-fan-gu'];
  const expected = ['美食作家王刚', '雪鱼探店', '老饭骨'];
  for (let i = 0; i < folders.length; ++i) {
    const channel = await Channels.findChannelFromFolder(folders[i]);
    expect(channel).toBeTruthy();
    expect(channel.label).toEqual(expected[i]);
  }
});