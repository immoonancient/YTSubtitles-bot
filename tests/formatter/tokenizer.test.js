const Tokenizer = require('../../formatter/tokenizer.js');
const Timeline = require('../../formatter/timeline.js');
const Timestamp = require('../../formatter/timestamp.js');

test('tokenize() #541', () => {
  const url = 'https://youtu.be/n9ncgbVmKN4';

  const input = [
    url,
    '',
    '# 在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾',
    'Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!',
    `# ${Tokenizer.TitleTooLongMarkString}`,
    '1',
    '00:00:02,100 --> 00:00:04,100',
    '佛山 顺德',
    'Shunde, Foshan',
    '# shift forward 00:00:01,000',
    '2',
    '00:00:14,160 --> 00:00:16,800',
    '我们现在要去吃煲仔饭',
    'We are now heading for “baozaifan” (claypot rice)'];

  const expected = [
    new Tokenizer.classes.URLToken(
      ["https://youtu.be/n9ncgbVmKN4"],
      "https://youtu.be/n9ncgbVmKN4",
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      "",
    ),
    new Tokenizer.classes.TextLineToken(
      ["# 在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾"],
      "在顺德吃煲仔饭，40到80元一份，锅比脸还大！量大料足吃过瘾",
    ),
    new Tokenizer.classes.TextLineToken(
      ["Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!"],
      "Claypot Rice in Shunde, served in a pot bigger than your face! Big and Satisfying!",
    ),
    new Tokenizer.classes.TitleTooLongMarkToken(
      [`# ${Tokenizer.TitleTooLongMarkString}`],
      Tokenizer.TitleTooLongMarkString
    ),
    new Tokenizer.classes.TimelineToken(
      [
        "1",
        "00:00:02,100 --> 00:00:04,100",
      ],
      new Timeline(
        new Timestamp("00", "00", "02", "100"),
        new Timestamp("00", "00", "04", "100"),
      ),
    ),
    new Tokenizer.classes.TextLineToken(
      ["佛山 顺德"],
      "佛山 顺德",
    ),
    new Tokenizer.classes.TextLineToken(
      ["Shunde, Foshan"],
      "Shunde, Foshan",
    ),
    new Tokenizer.classes.ControlToken(
      ["# shift forward 00:00:01,000"],
      ["shift", "forward", "00:00:01,000"],
    ),
    new Tokenizer.classes.TimelineToken(
      [
        "2",
        "00:00:14,160 --> 00:00:16,800",
      ],
      new Timeline(
        new Timestamp("00", "00", "14", "160"),
        new Timestamp("00", "00", "16", "800"),
      ),
    ),
    new Tokenizer.classes.TextLineToken(
      ["我们现在要去吃煲仔饭"],
      "我们现在要去吃煲仔饭",
    ),
    new Tokenizer.classes.TextLineToken(
      ["We are now heading for “baozaifan” (claypot rice)"],
      "We are now heading for “baozaifan” (claypot rice)",
    ),
  ];

  const output = Tokenizer.tokenize(input, 'srt');
  expect(output).toEqual(expected);
});

test('tokenize() #530 with broken title lines', () => {
  const url = 'https://youtu.be/K6TfhFFsu8U';

  const input = `
${url}

标题

贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香

Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles

简介
探寻世界最具烟火气息的美味，我是雪鱼。在贵州贵阳，有一种特别的美食叫做脆哨，是一种熬猪油时剩下的“油渣”，不管是用五花肉还是大肥肉，或是精瘦肉，经过巧手烹制，却变成了一道别致的黔中美味。这几天吃糯米饭、吃粉、吃面时候，里面都能找到或多或少的脆哨。由于熬一锅脆哨费事费力，通常想要2个师傅共同劳作2个小时，这样做出来的脆哨不仅味美，也更有传统意义。经营了30年的老店，熟客非常多，经常一天要做6大锅才能满足需求。
I’m Xue Yu, in search for the best street food in the world
There is a unique local specialty in Guiyang, Guizhou, called ‘Cui Shao’, which are the residues from making lard. No matter whether they are made from pork belly, pork fat or lean pork meat, with fine skills and expertise, Cui Shao has become a special delicacy in Central Guizhou. I can always find Cui Shao more or less in my dishes when I eat sticky rice, noodles or rice noodles in Guiyang recently. It requires 2 masters to collaboratively cook for 2 hours for every single pot of Cui Shao. Such effort not only guarantees the best flavour, but also is a homage to the tradition. Having been running for 30 years, the shop I visited today has so many return customers that sometimes it needs to make 6 pots of Cui Shao to meet the foodies’ demands.
`.split('\n');

  const expected = [
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
    new Tokenizer.classes.URLToken(
      ["https://youtu.be/K6TfhFFsu8U"],
      "https://youtu.be/K6TfhFFsu8U"
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
    new Tokenizer.classes.ControlToken(
      ["标题"],
      ["标题"]
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
    new Tokenizer.classes.TextLineToken(
      ["贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香"],
      "贵阳五花肉土豪吃法！一锅250斤只出30斤，卖价很贵，拌面吃很香"
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
    new Tokenizer.classes.TextLineToken(
      ["Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles"],
      "Luxurious way to eat pork belly in Guiyang! Only 15kg of final products are made from 125kg of pork belly. Expensive, but perfect with noodles"
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
    new Tokenizer.classes.ControlToken(
      ["简介"],
      ["简介"]
    ),
    new Tokenizer.classes.TextLineToken(
      ["探寻世界最具烟火气息的美味，我是雪鱼。在贵州贵阳，有一种特别的美食叫做脆哨，是一种熬猪油时剩下的“油渣”，不管是用五花肉还是大肥肉，或是精瘦肉，经过巧手烹制，却变成了一道别致的黔中美味。这几天吃糯米饭、吃粉、吃面时候，里面都能找到或多或少的脆哨。由于熬一锅脆哨费事费力，通常想要2个师傅共同劳作2个小时，这样做出来的脆哨不仅味美，也更有传统意义。经营了30年的老店，熟客非常多，经常一天要做6大锅才能满足需求。"],
      "探寻世界最具烟火气息的美味，我是雪鱼。在贵州贵阳，有一种特别的美食叫做脆哨，是一种熬猪油时剩下的“油渣”，不管是用五花肉还是大肥肉，或是精瘦肉，经过巧手烹制，却变成了一道别致的黔中美味。这几天吃糯米饭、吃粉、吃面时候，里面都能找到或多或少的脆哨。由于熬一锅脆哨费事费力，通常想要2个师傅共同劳作2个小时，这样做出来的脆哨不仅味美，也更有传统意义。经营了30年的老店，熟客非常多，经常一天要做6大锅才能满足需求。"
    ),
    new Tokenizer.classes.TextLineToken(
      ["I’m Xue Yu, in search for the best street food in the world"],
      "I’m Xue Yu, in search for the best street food in the world"
    ),
    new Tokenizer.classes.TextLineToken(
      ["There is a unique local specialty in Guiyang, Guizhou, called ‘Cui Shao’, which are the residues from making lard. No matter whether they are made from pork belly, pork fat or lean pork meat, with fine skills and expertise, Cui Shao has become a special delicacy in Central Guizhou. I can always find Cui Shao more or less in my dishes when I eat sticky rice, noodles or rice noodles in Guiyang recently. It requires 2 masters to collaboratively cook for 2 hours for every single pot of Cui Shao. Such effort not only guarantees the best flavour, but also is a homage to the tradition. Having been running for 30 years, the shop I visited today has so many return customers that sometimes it needs to make 6 pots of Cui Shao to meet the foodies’ demands."],
      "There is a unique local specialty in Guiyang, Guizhou, called ‘Cui Shao’, which are the residues from making lard. No matter whether they are made from pork belly, pork fat or lean pork meat, with fine skills and expertise, Cui Shao has become a special delicacy in Central Guizhou. I can always find Cui Shao more or less in my dishes when I eat sticky rice, noodles or rice noodles in Guiyang recently. It requires 2 masters to collaboratively cook for 2 hours for every single pot of Cui Shao. Such effort not only guarantees the best flavour, but also is a homage to the tradition. Having been running for 30 years, the shop I visited today has so many return customers that sometimes it needs to make 6 pots of Cui Shao to meet the foodies’ demands."
    ),
    new Tokenizer.classes.EmptyLineToken(
      [""],
      ""
    ),
  ];

  const output = Tokenizer.tokenize(input);
  expect(output).toEqual(expected);
});

test.only('#1217', () => {
  const input = [
    '# 标题（翻译主要意思即可，不要超过 100 个字符）',
    '# 把老家梨树结的果子包起来防止鸟儿来偷吃！偶遇停电怎么办？居然还能继续剪视频！',
    '# Covering pears with bags to prevent birds! How to edit video during power outage!',
  ];

  const expected = [
    new Tokenizer.classes.ControlToken(
      ['# 标题（翻译主要意思即可，不要超过 100 个字符）'],
      ['标题']
    ),
    new Tokenizer.classes.TextLineToken(
      ["# 把老家梨树结的果子包起来防止鸟儿来偷吃！偶遇停电怎么办？居然还能继续剪视频！"],
      "# 把老家梨树结的果子包起来防止鸟儿来偷吃！偶遇停电怎么办？居然还能继续剪视频！"
    ),
    new Tokenizer.classes.TextLineToken(
      ['# Covering pears with bags to prevent birds! How to edit video during power outage!'],
      '# Covering pears with bags to prevent birds! How to edit video during power outage!'
    ),
  ];

  const output = Tokenizer.tokenize(input);
  expect(output).toEqual(expected);
});