const Formatter = require('../../formatter/formatter.js');

test('convertPassageIntoLines() U2028 line separator', () => {
  const input = `0:00:00.560,0:00:01.800 哈喽大家好
  Hello everybody
  0:00:01.800,0:00:03.575 今天我们又不用做菜了
  Today we are not goona cook `;
  const output = Formatter.testing.convertPassageIntoLines(input);
  expect(output).toEqual([
    '0:00:00.560,0:00:01.800',
    '哈喽大家好',
    'Hello everybody',
    '0:00:01.800,0:00:03.575',
    '今天我们又不用做菜了',
    'Today we are not goona cook'
  ]);
});

test('formatSubtitles() #535', () => {
  const url = 'https://youtu.be/pvHcQFix0NA';

  const input = `0:00:00.560,0:00:01.800 哈喽大家好
  Hello everybody
  0:00:01.800,0:00:03.575 今天我们又不用做菜了
  Today we are not goona cook `;

  const expected = [
    `# ${url}`,
    '',
    '0:00:00.560,0:00:01.800',
    '# 哈喽大家好',
    'Hello everybody',
    '',
    '0:00:01.800,0:00:03.575',
    '# 今天我们又不用做菜了',
    'Today we are not goona cook'
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('formatSubtitles() #541', () => {
  const url = 'https://youtu.be/n9ncgbVmKN4';

  // Test adding # and regenerate empty lines between subtitles
  const input = [
    '# 在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾',
    'Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!',
    '1',
    '00:00:02,100 --> 00:00:04,100',
    '佛山 顺德',
    'Shunde, Foshan',
    '2',
    '00:00:14,160 --> 00:00:16,800',
    '我们现在要去吃煲仔饭',
    'We are now heading for “baozaifan” (claypot rice)'].join('\n');

  const expected = [
    `# ${url}`,
    '',
    '# 在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾',
    '# Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!',
    '',
    '1',
    '00:00:02,100 --> 00:00:04,100',
    '# 佛山 顺德',
    'Shunde, Foshan',
    '',
    '2',
    '00:00:14,160 --> 00:00:16,800',
    '# 我们现在要去吃煲仔饭',
    'We are now heading for “baozaifan” (claypot rice)'];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('testFormat() #541', () => {
  const input = [
    '# 在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾',
    'Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!',
    '1',
    '00:00:02,100 --> 00:00:04,100',
    '佛山 顺德',
    'Shunde, Foshan',
    '2',
    '00:00:14,160 --> 00:00:16,800',
    '我们现在要去吃煲仔饭',
    'We are now heading for “baozaifan” (claypot rice)'].join('\n');
  expect(Formatter.testFormat(input)).toEqual('srt');
});

test('formatSubtitles() #530', () => {
  const url = 'https://youtu.be/K6TfhFFsu8U';

  const input = `
贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香
貴陽五花肉土豪吃法！壹鍋250斤只出30斤，賣價很貴，拌面吃很香
Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles

探寻世界最具烟火气息的美味，我是雪鱼。在贵州贵阳，有一种特别的美食叫做脆哨，是一种熬猪油时剩下的“油渣”，不管是用五花肉还是大肥肉，或是精瘦肉，经过巧手烹制，却变成了一道别致的黔中美味。这几天吃糯米饭、吃粉、吃面时候，里面都能找到或多或少的脆哨。由于熬一锅脆哨费事费力，通常想要2个师傅共同劳作2个小时，这样做出来的脆哨不仅味美，也更有传统意义。经营了30年的老店，熟客非常多，经常一天要做6大锅才能满足需求。
I’m Xue Yu, in search for the best street food in the world
There is a unique local specialty in Guiyang, Guizhou, called ‘Cui Shao’, which are the residues from making lard. No matter whether they are made from pork belly, pork fat or lean pork meat, with fine skills and expertise, Cui Shao has become a special delicacy in Central Guizhou. I can always find Cui Shao more or less in my dishes when I eat sticky rice, noodles or rice noodles in Guiyang recently. It requires 2 masters to collaboratively cook for 2 hours for every single pot of Cui Shao. Such effort not only guarantees the best flavour, but also is a homage to the tradition. Having been running for 30 years, the shop I visited today has so many return customers that sometimes it needs to make 6 pots of Cui Shao to meet the foodies’ demands.

地址：贵州省贵阳市民生路丁家脆哨
Address: Ding Jia Cui Shao, Minsheng Rd, Guiyang, Guizhou
营业时间：07：00-19：00
Business hours: 7 am – 7 pm

小鱼已走过近100个城市，查看当地小吃美食，请关注我的Youtube频道。
I have travelled to nearly 100 cities, checking out local street food and specialties. Please follow my YouTube channel.
我也经常在这里出现哦！Follow my Instagram here: https://www.instagram.com/xueyu_foodtravel/

1
00:00:01,880 --> 00:00:05,640
贵州·贵阳
Guiyang, Guizhou

2
00:00:17,480 --> 00:00:19,200
你看 这几天咱们在贵阳
Hey guys! So recently in Guiyang`;

  const expected = [
    `# ${url}`,
    '',
    '# 贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香',
    '# 貴陽五花肉土豪吃法！壹鍋250斤只出30斤，賣價很貴，拌面吃很香',
    '# Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles',
    '',
    '# 探寻世界最具烟火气息的美味，我是雪鱼。在贵州贵阳，有一种特别的美食叫做脆哨，是一种熬猪油时剩下的“油渣”，不管是用五花肉还是大肥肉，或是精瘦肉，经过巧手烹制，却变成了一道别致的黔中美味。这几天吃糯米饭、吃粉、吃面时候，里面都能找到或多或少的脆哨。由于熬一锅脆哨费事费力，通常想要2个师傅共同劳作2个小时，这样做出来的脆哨不仅味美，也更有传统意义。经营了30年的老店，熟客非常多，经常一天要做6大锅才能满足需求。',
    '# I’m Xue Yu, in search for the best street food in the world',
    '# There is a unique local specialty in Guiyang, Guizhou, called ‘Cui Shao’, which are the residues from making lard. No matter whether they are made from pork belly, pork fat or lean pork meat, with fine skills and expertise, Cui Shao has become a special delicacy in Central Guizhou. I can always find Cui Shao more or less in my dishes when I eat sticky rice, noodles or rice noodles in Guiyang recently. It requires 2 masters to collaboratively cook for 2 hours for every single pot of Cui Shao. Such effort not only guarantees the best flavour, but also is a homage to the tradition. Having been running for 30 years, the shop I visited today has so many return customers that sometimes it needs to make 6 pots of Cui Shao to meet the foodies’ demands.',
    '',
    '# 地址：贵州省贵阳市民生路丁家脆哨',
    '# Address: Ding Jia Cui Shao, Minsheng Rd, Guiyang, Guizhou',
    '# 营业时间：07：00-19：00',
    '# Business hours: 7 am – 7 pm',
    '',
    '# 小鱼已走过近100个城市，查看当地小吃美食，请关注我的Youtube频道。',
    '# I have travelled to nearly 100 cities, checking out local street food and specialties. Please follow my YouTube channel.',
    '# 我也经常在这里出现哦！Follow my Instagram here: https://www.instagram.com/xueyu_foodtravel/',
    '',
    '1',
    '00:00:01,880 --> 00:00:05,640',
    '# 贵州·贵阳',
    'Guiyang, Guizhou',
    '',
    '2',
    '00:00:17,480 --> 00:00:19,200',
    '# 你看 这几天咱们在贵阳',
    'Hey guys! So recently in Guiyang'];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('formatSubtitles() #9', () => {
  const url = 'https://youtu.be/-T2f78X4oiA';
  const input = `https://youtu.be/-T2f78X4oiA

A: 雪鱼
B: 店主
C: 路人
D: 摄影

B: 64元 是吧？
64 RMB, right?

C: 对，64元
Yes, 64 RMB`;

  const output = Formatter.format(input, url);
  expect(output).toEqual(input.split('\n'));
});

test('formatSubtitles() #565', () => {
  const url = 'https://youtu.be/NIY6aPsSe3s';

  const input = `00:00:01,920 --> 00:00:05,960
佛山·顺德
Shunde, Foshan

00:00:05,960 --> 00:00:08,960
看到没 我后面挂的这4只烧鹅
See? The four roast geese behind me.`;

  const expected = [
    `# ${url}`,
    '',
    '1',
    '00:00:01,920 --> 00:00:05,960',
    '# 佛山·顺德',
    'Shunde, Foshan',
    '',
    '2',
    '00:00:05,960 --> 00:00:08,960',
    '# 看到没 我后面挂的这4只烧鹅',
    'See? The four roast geese behind me.'
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('Subtitle.parse() commented srt', () => {
  const input = [
    '# 1',
    '# 00:00:00,000 --> 00:00:01,000',
    '# whatever'
  ];

  const [output, next] = Formatter.testing.Subtitle.parse(input, 'srt');
  expect(output).toEqual(null);
});

test('HTTP route commented srt', () => {
  const url = 'https://youtu.be/XXXXXXXXXX';
  const input = [
    `# ${url}`,
    '',
    '# 1',
    '# 00:00:00,000 --> 00:00:01,000',
    '# whatever'
  ];

  const contents = Formatter.testing.fuzzyParse(input, url, 'srt');
  const result = new Formatter.testing.Subtitles(contents).toString('srt');
  expect(result).toEqual(input);
});

test('formatSubtitles() #708', () => {
  const url = 'https://youtu.be/Wtj8-kc72_U';

  const input = [
    "0:01:47.000,0:02:06.680",
    "下面开始技术总结",
    "第一，切好的菱角菜必须加入盐糖白醋",
    "刹水，这一步的目的是保证菜品的爽脆",
    "第二，刹好水之后可以不用清洗直接加料凉拌",
    "第三，不喜欢吃辣的同学可以不加辣椒和花椒",
    "只需加入盐和白糖即可",
    "凉拌菱角菜的技术总结完毕",
    "Now, let's summarize the key techniques:",
    "First, we need to add the salt. sugar, and rice vinegar mixture to the cutted veggies to remove the water, making sure the final product is refreshing and crispy",
    "Secondly, we don't need to rinse the veggies after the water removal step",
    "Thirdly, If you don't like spicy food, you don't need to add chili and peppercorn; salt and sugar will be enough.",
    "Above are all the techniques for the spicy mustard plant stem salad"
  ].join('\n');

  // Should identify and anotate multiple Chinese lines
  const expected = [
    `# ${url}`,
    '',
    "0:01:47.000,0:02:06.680",
    "# 下面开始技术总结",
    "# 第一，切好的菱角菜必须加入盐糖白醋",
    "# 刹水，这一步的目的是保证菜品的爽脆",
    "# 第二，刹好水之后可以不用清洗直接加料凉拌",
    "# 第三，不喜欢吃辣的同学可以不加辣椒和花椒",
    "# 只需加入盐和白糖即可",
    "# 凉拌菱角菜的技术总结完毕",
    "Now, let's summarize the key techniques:",
    "First, we need to add the salt. sugar, and rice vinegar mixture to the cutted veggies to remove the water, making sure the final product is refreshing and crispy",
    "Secondly, we don't need to rinse the veggies after the water removal step",
    "Thirdly, If you don't like spicy food, you don't need to add chili and peppercorn; salt and sugar will be enough.",
    "Above are all the techniques for the spicy mustard plant stem salad"
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});