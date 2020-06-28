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

test('formatSubtitles() #530 with broken title lines', () => {
  const url = 'https://youtu.be/K6TfhFFsu8U';

  const input = `
标题

贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香

Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles

简介
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
    '# 标题 （标题翻译过长，请将其精简到 100 字符内）',
    '# 贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香',
    '# Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles',
    '# |--------------------------- title should not be longer than this line ----------------------------|',
    '',
    '# 简介',
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
    '# 简介',
    '',
    '# description placeholder',
    '',
    '1',
    '00:00:00,000 --> 00:00:01,000',
    '# 字幕内容',
    'whatever',
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

test('formatSubtitles() 191019_Nuo_mi_fan', () => {
  const url = 'https://youtu.be/XXXXXXXXXX';

  const input = [
    '00:02:19,080 --> 00:02:21,880',
    '糯米吃起来是比较筋道 弹牙',
    'The glutinous rice is relatively chewy     #还是al dente?'
  ].join('\n');

  // Should identify English line correctly even if it contains Chinese comment
  const expected = [
    `# ${url}`,
    '',
    '1',
    '00:02:19,080 --> 00:02:21,880',
    '# 糯米吃起来是比较筋道 弹牙',
    'The glutinous rice is relatively chewy     #还是al dente?'
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('formatSubtitles() 20191103-han-kao-jia', () => {
  const url = 'https://youtu.be/XXXXXXXXXX';

  const input = [
    '0:02:41.695,0:02:42.805',
    '对了',
    'Yeah',
    '',
    '0:02:53.245,0:02:54.245',
    '90厘米',
    '90 centimeters',
    '',
    '0:02:54.300,0:02:55.300',
    '90',
    '90'
  ].join('\n');

  // Should identify a Chinese line correctly even if it contains no Chinese
  const expected = [
    `# ${url}`,
    '',
    '0:02:41.695,0:02:42.805',
    '# 对了',
    'Yeah',
    '',
    '0:02:53.245,0:02:54.245',
    '# 90厘米',
    '90 centimeters',
    '',
    '0:02:54.300,0:02:55.300',
    '# 90',
    '90'
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('formatSubtitles() 20190909-fo-tiao-qiang', () => {
  const url = 'https://youtu.be/XXXXXXXXXX';

  const input = [
    '00:06:34.680,00:06:36.160',
    '蹄筋就是蹄筋没错,就是像一个人字形的嘛',
    'Tendon is correct, looks like the Chinese character "人" ("ren", human)'
  ].join('\n');

  // Should identify an English line correctly even if it mixes a little Chinese
  const expected = [
    `# ${url}`,
    '',
    '00:06:34.680,00:06:36.160',
    '# 蹄筋就是蹄筋没错,就是像一个人字形的嘛',
    'Tendon is correct, looks like the Chinese character "人" ("ren", human)'
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test('TitleSection.toString() within 100 characters', () => {
  const title = new Formatter.testing.TitleSection([
    '华农兄弟：嫩粽叶长出来了，摘点来包粽子，很香很好吃哦',
    'Huanong Brothers: The young leaves are growing out. We pick some to make rice dumplings. Tasty!'
  ]);
  const expected = [
    '# 标题',
    '# 华农兄弟：嫩粽叶长出来了，摘点来包粽子，很香很好吃哦',
    '# Huanong Brothers: The young leaves are growing out. We pick some to make rice dumplings. Tasty!'
  ];

  expect(title.toString()).toEqual(expected);
});

test('TitleSection.toString() exceeding 100 characters', () => {
  const title = new Formatter.testing.TitleSection([
    '厨师长分享：“宽油炸鸡”的奇怪做法？主要是分享实用的防烫技巧！ft. 手工耿 （非严肃美食教学视频，大家请勿模仿，不喜勿喷）',
    'Chef Wang shares: A strange way of cooking \'Fried chicken in broad oil\'? Just want to share useful tips to prevent burns! ft. Craftsman Geng (手工耿) (Please don\'t imitate as this is not a serious cooking video)'
  ]);
  const expected = [
    '# 标题 （标题翻译过长，请将其精简到 100 字符内）',
    '# 厨师长分享：“宽油炸鸡”的奇怪做法？主要是分享实用的防烫技巧！ft. 手工耿 （非严肃美食教学视频，大家请勿模仿，不喜勿喷）',
    '# Chef Wang shares: A strange way of cooking \'Fried chicken in broad oil\'? Just want to share useful tips to prevent burns! ft. Craftsman Geng (手工耿) (Please don\'t imitate as this is not a serious cooking video)',
    `# |--------------------------- title should not be longer than this line ----------------------------|`
  ];

  expect(title.toString()).toEqual(expected);
});

test('formatSubtitles() 20200613-jiang-xiang-xian-cai-si.srt', () => {
  const url = 'https://youtu.be/32Gf4DAnpJg';
  const input =
`# ${url}

# 标题 （标题翻译过长，请将其精简到 100 字符内）
# 【國宴大師•醬香鹹菜絲】比肉還香，在家就能做的小菜，夾火燒、夾饅頭，喝粥、拌麵條，都是絕配！|老飯骨
# State Banquet Master Chef - Soy Sauce Salted Turnip Julienne. Easy and Yummy Side Dish!
# |--------------------------- title should not be longer than this line ----------------------------|

# 简介

# 小友們好，今天我們的大師姐要給大家做一道家常小菜——醬香鹹菜絲，據說比肉還香呢！
# 這醬香鹹菜絲的關鍵還是要先把鹹菜絲沖水，洗盡所有鹽味，再把所有水擠乾淨嘍。正所謂有味使其出，無味使其入，烹飪的原理真是妙嘞！
# 另外視頻最後大爺為大家解答的問題：軟炸糊到底怎麼調合適？
# 出處來自軟炸魚條這期視頻，小友們可以去複習一下！⬇️
# https://www.youtube.com/watch?v=Rev4LJsvpfo

# Hello friends, today our Da Shi Jie (senior female apprentice) shares a home-made side dish “ Soy Sauce Salted Turnip Julienne”, even yummier than meat! The most critical step of this dish is to wash the salted turnip julienne thoroughly -- getting rid of the saltiness and then squeezing water off it, so called “clear food’s original flavor if it has; add new flavor if it doesn’t”. The principle of cuisine is really wonderful!
# At the end of this video Da Ye answers a question: what is the best way to make the batter for-fried stuff? This question comes from a previous video “golden and crispy soft fried fish fingers”. You could review it via this link: https://www.youtube.com/watch?v=Rev4LJsvpfo.

# import intro

# 字幕

1
00:00:00,000 --> 00:00:02,160
# 早上起来熬一锅棒子碴粥
After getting up in the morning, boil a pot of corn congee

2
00:00:02,160 --> 00:00:06,520
# 把咸菜往火烧里一夹 这就是生活
And put some salted vegetables into a Huo Shao -- this is the life

3
00:00:06,520 --> 00:00:08,880
# 特别家常的酱香咸菜丝
Home-made Soy Sauce Salted Turnip Julienne

# shift forward 00:06:06,500

132
00:00:00,000 --> 00:00:02,400
# 上回您做了一个软炸鱼条
Last time you soft fried some fish pastes

133
00:00:02,680 --> 00:00:05,640
# 他想问这个小苏打可不可以不加
People want to ask whether it’s possible not to add baking soda`;

  const expected = [
    "# https://youtu.be/32Gf4DAnpJg",
    "",
    "# 标题",
    "# 【國宴大師•醬香鹹菜絲】比肉還香，在家就能做的小菜，夾火燒、夾饅頭，喝粥、拌麵條，都是絕配！|老飯骨",
    "# State Banquet Master Chef - Soy Sauce Salted Turnip Julienne. Easy and Yummy Side Dish!",
    "",
    "# 简介",
    "",
    "# 小友們好，今天我們的大師姐要給大家做一道家常小菜——醬香鹹菜絲，據說比肉還香呢！",
    "# 這醬香鹹菜絲的關鍵還是要先把鹹菜絲沖水，洗盡所有鹽味，再把所有水擠乾淨嘍。正所謂有味使其出，無味使其入，烹飪的原理真是妙嘞！",
    "# 另外視頻最後大爺為大家解答的問題：軟炸糊到底怎麼調合適？",
    "# 出處來自軟炸魚條這期視頻，小友們可以去複習一下！⬇️",
    "# https://www.youtube.com/watch?v=Rev4LJsvpfo",
    "",
    "# Hello friends, today our Da Shi Jie (senior female apprentice) shares a home-made side dish “ Soy Sauce Salted Turnip Julienne”, even yummier than meat! The most critical step of this dish is to wash the salted turnip julienne thoroughly -- getting rid of the saltiness and then squeezing water off it, so called “clear food’s original flavor if it has; add new flavor if it doesn’t”. The principle of cuisine is really wonderful!",
    "# At the end of this video Da Ye answers a question: what is the best way to make the batter for-fried stuff? This question comes from a previous video “golden and crispy soft fried fish fingers”. You could review it via this link: https://www.youtube.com/watch?v=Rev4LJsvpfo.",
    "",
    "# import intro",
    "",
    "# 字幕",
    "",
    "1",
    "00:00:00,000 --> 00:00:02,160",
    "# 早上起来熬一锅棒子碴粥",
    "After getting up in the morning, boil a pot of corn congee",
    "",
    "2",
    "00:00:02,160 --> 00:00:06,520",
    "# 把咸菜往火烧里一夹 这就是生活",
    "And put some salted vegetables into a Huo Shao -- this is the life",
    "",
    "3",
    "00:00:06,520 --> 00:00:08,880",
    "# 特别家常的酱香咸菜丝",
    "Home-made Soy Sauce Salted Turnip Julienne",
    "",
    "# shift forward 00:06:06,500",
    "",
    "4",
    "00:00:00,000 --> 00:00:02,400",
    "# 上回您做了一个软炸鱼条",
    "Last time you soft fried some fish pastes",
    "",
    "5",
    "00:00:02,680 --> 00:00:05,640",
    "# 他想问这个小苏打可不可以不加",
    "People want to ask whether it’s possible not to add baking soda",
  ];

  const output = Formatter.format(input, url);
  expect(output).toEqual(expected);
});

test.only('checkFormat() title length and timeline validity', () => {
  lines = 
`# https://youtu.be/n9ncgbVmKN4

# 标题（翻译在100字以内）：

# 【国宴大师•黑醋带鱼卷】香酥无骨、酸甜可口，咬下去汁水四溢的黑醋带鱼卷要怎么做？老饭骨重聚欢乐多！
# lorum ipsum dolor sit amet lorum ipsum dolor sit ametlorum ipsum dolor sit ametlorum ipsum dolor sit ametlorum ipsum dolor sit amet

# 简介：

# 小友们好，最近是不是很久没看到我们老饭骨哥仨一起出现了？大家想我们吗？
# 今天是由三叔的徒弟小东北给大家带来一道中西融合菜——黑醋带鱼卷。
# 我们用的是意大利黑醋，家里没有黑醋的小友们用自己本地的醋就可以了。
# 带鱼呢，它本身也是一味中药材，具有补虚，解毒，止血之功效。
# 吃带鱼对我们的身体大有好处，但是带鱼就怕处理不好腥味重。
# 带鱼要先进行腌制去除腥味，然后放进油锅里炸至金黄脆嫩。
# 最后还要淋上熬制许久的黑醋，酸甜可口！
# 这道菜得到了我们的一致好评，不仅味道好，在成菜形式上也接轨国际，
# 真正做到了融会贯通。看这摆盘，多美！
# 各位小友们在观看视频的时候也要活学活用，一起把这些好的技法传承下去！

# import intro

# 字幕：

1
00:00:00,120 --> 00:00:02,200
# 今天用带鱼做凉菜

2
00:00:02,200 --> 00:00:05,120
# 搅拌一下 巧克力色

3
00:00:05,120 --> 00:00:06,440
# 黑醋带鱼卷

4
00:00:06,440 --> 00:00:07,800
# 绝对好吃

5
00:00:07,800 --> 00:00:01,320
# 小东北 来自于东北 东北人`
    .split('\n');

  const file = { filename: 'subtitles/test.srt' };

  const expectedConclusion = 'failure';
  const expectedSummary = 'Found the following format errors';
  const expectedText = [
    'Title is too long. Please shrink the title to within 100 characters.',
    '',
    'File contains invalid timelines',
  ].join('\n');
  const expectedAnnotations = [
    {
      "annotation_level": "failure",
      "end_line": 6,
      "message": "Title translation is too long. Please shrink to within 100 characters.",
      "start_line": 6,
    },
    {
      "annotation_level": "failure",
      "end_line": 42,
      "message": "Invalid timeline. Start time must be less than end time.",
      "start_line": 42,
    },
  ];

  const expected = {
    conclusion: expectedConclusion,
    summary: expectedSummary,
    text: expectedText,
    annotations: expectedAnnotations,
  };

  const output = Formatter.checkFormat(file, lines, 'srt');
  expect(output).toEqual(expected);
});