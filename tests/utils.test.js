const Utils = require('../utils.js');

test('getVideoURLFromTitle() #277', () => {
  const title = '[盗月社] 汕头猪脚饭 - https://www.youtube.com/watch?v=95Ydh6HXUQQ';
  expect(Utils.getVideoURLFromTitle(title)).toBe('https://www.youtube.com/watch?v=95Ydh6HXUQQ');
});

test('getVideoURLFromTitle() #533', () => {
  const title = '【雪鱼】贵阳肠旺面-https://youtu.be/d2Ja5vk6838';
  expect(Utils.getVideoURLFromTitle(title)).toBe('https://youtu.be/d2Ja5vk6838');
});

test('getVideoURLFromTitle() #494', () => {
  const title = '【雪鱼探店】大叔凌晨3点采购200斤猪肠https://www.youtube.com/watch?v=CSQi56f2OkI&t=1s';
  expect(Utils.getVideoURLFromTitle(title)).toBe('https://www.youtube.com/watch?v=CSQi56f2OkI');
});

test('getVideoURLFromTitle() #523', () => {
  const title = '[华农兄弟] 华农兄弟看一下被霜打死的象草再去拔几个老弟种得萝卜来吃 - https://youtu.be/eAM6tmkN-z4';
  expect(Utils.getVideoURLFromTitle(title)).toBe('https://youtu.be/eAM6tmkN-z4');
});

test('getVideoURLFromTitle() #512', () => {
  const title = '【雪鱼】贵阳糯米饭-https://youtu.be/ICodP_g_JJk';
  expect(Utils.getVideoURLFromTitle(title)).toBe('https://youtu.be/ICodP_g_JJk');
});

test('getVideoIDFromTitle() #512', () => {
  const title = '【雪鱼】贵阳糯米饭-https://youtu.be/ICodP_g_JJk';
  expect(Utils.getVideoIDFromTitle(title)).toBe('ICodP_g_JJk');
});

test('mainTitleToPinyin() #669', () => {
  const title = '[老饭骨] 去骨香酥鸭 - https://youtu.be/NmG6KB5NQ4o';
  expect(Utils.mainTitleToPinyin(title)).toBe('qu-gu-xiang-su-ya');
});

test('mainTitleToPinyin() #672', () => {
  const title = '【美食作家王刚】炸鲜奶 - https://youtu.be/MJuNod7VaSQ';
  expect(Utils.mainTitleToPinyin(title)).toBe('zha-xian-nai');
});

test('mainTitleToPinyin() #641', () => {
  const title = '【雪鱼】广东炖汤-https://www.youtube.com/watch?v=7Rs_ElFXpN4';
  expect(Utils.mainTitleToPinyin(title)).toBe('guang-dong-dun-tang');
})