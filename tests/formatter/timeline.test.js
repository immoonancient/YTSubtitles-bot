const Timeline = require('../../formatter/timeline.js');
const Timestamp = require('../../formatter/timestamp.js');

test('Timeline sbv', () => {
  const input = '00:00:02.250,00:00:02.750';
  const result = Timeline.parse(input, 'sbv');
  expect(result).toEqual(new Timeline(
    new Timestamp('00', '00', '02', '250'),
    new Timestamp('00', '00', '02', '750')
  ));
  expect(result.toString('sbv')).toEqual(input);
});

test('Timeline default format', () => {
  const input = '00:00:02.250,00:00:02.750';
  const result = Timeline.parse(input);
  expect(result).toEqual(new Timeline(
    new Timestamp('00', '00', '02', '250'),
    new Timestamp('00', '00', '02', '750')
  ));
  expect(result.toString()).toEqual(input);
});

test('Timeline.parse() sbv fail', () => {
  const input = '00:00:02.250,00:00:02.750 xxx';
  const result = Timeline.parse(input, 'sbv');
  expect(result).toEqual(null);
});

test('Timeline srt', () => {
  const input = '00:00:02,250 --> 00:00:02,750';
  const result = Timeline.parse(input, 'srt');
  expect(result).toEqual(new Timeline(
    new Timestamp('00', '00', '02', '250'),
    new Timestamp('00', '00', '02', '750')
  ));
  expect(result.toString('srt')).toEqual(input);
});

test('Timeline.parse() srt fail', () => {
  const input = '00:00:02,250 --> 00:00:02,750 xxx';
  const result = Timeline.parse(input, 'srt');
  expect(result).toEqual(null);
});

test('Timeline.parse() srt commented', () => {
  const input = '# 00:00:02,250 --> 00:00:02,750';
  const result = Timeline.parse(input, 'srt');
  expect(result).toEqual(null);
});