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