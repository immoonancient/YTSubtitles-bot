const Hinter = require('../hinter.js');

test('Hinter #791', async () => {
  const passage =
    `0:00:35.475,0:00:38.475
    将处理好的猪皮和耳朵下锅焯水5分钟

    0:00 :41.450,0:00:43.500
    中途再加入适量的料酒去腥`;

  const hinter = await Hinter.create();
  const hints = hinter.getHints(passage);

  expect(hints).toEqual({
    "焯水": [{
      cn: "焯水",
      en: "parboil",
      category: "technical"
    }],
    "料酒": [{
      cn: "料酒",
      en: "Chinese cooking wine",
      category: "condiment"
    }]
  });
});

test('Hinter #788 channel filter', async () => {
  const passage =
    `100
    00:04:28,160 --> 00:04:28,960
    这颜色挺漂亮的
    
    166
    00:06:56,800 --> 00:06:58,520
    二伯怎么样`;

  const hinter = await Hinter.create();
  const hints = hinter.getHints(passage, 'lao-fan-gu');

  // Should get hint for "二伯", but not "漂亮" due to channel filter
  expect(hints).toEqual({
    "二伯": [{
      cn: "二伯",
      en: "Er Bai",
      category: "noun",
      channel: "lao-fan-gu"
    }]
  });
});