const Timestamp = require('../../formatter/timestamp.js');

test('Timestamp.toString() sbv', () => {
  const timestamp = new Timestamp('00', '00', '02', '250');
  expect(timestamp.toString('sbv')).toBe('00:00:02.250');
});

test('Timestamp.toString() srt', () => {
  const timestamp = new Timestamp('00', '00', '02', '250');
  expect(timestamp.toString('srt')).toBe('00:00:02,250');
});

test('Timestamp.toString() default format', () => {
  const timestamp = new Timestamp('00', '00', '02', '250');
  expect(timestamp.toString()).toBe('00:00:02.250');
});

test('Timestamp.toString() invalid format', () => {
  const timestamp = new Timestamp('00', '00', '02', '250');
  expect(() => timestamp.toString('invalid')).toThrow();
});

test('Timestamp.parse() sbv', () => {
  const input = '00:00:02.250,00:00:02.750';
  const result = Timestamp.parse(input, 'sbv');
  expect(result).toEqual([
    new Timestamp('00', '00', '02', '250'),
    ',00:00:02.750'
  ]);
});

test('Timestamp.parse() sbv failure', () => {
  const input = '00:00:02,250 --> 00:00:02,750';
  const result = Timestamp.parse(input, 'sbv');
  expect(result).toEqual([null, input]);
});

test('Timestamp.parse() srt', () => {
  const input = '00:00:02,250 --> 00:00:02,750';
  const result = Timestamp.parse(input, 'srt');
  expect(result).toEqual([
    new Timestamp('00', '00', '02', '250'),
    ' --> 00:00:02,750'
  ]);
});

test('Timestamp.parse() srt failure', () => {
  const input = '00:00:02.250,00:00:02.750';
  const result = Timestamp.parse(input, 'srt');
  expect(result).toEqual([null, input]);
});

test('Timestamp.parse() default format', () => {
  const input = '00:00:02.250,00:00:02.750';
  const result = Timestamp.parse(input);
  expect(result).toEqual([
    new Timestamp('00', '00', '02', '250'),
    ',00:00:02.750'
  ]);
});

test('Timestamp.parse() invalid format', () => {
  const input = '00:00:02.250,00:00:02.750';
  expect(() => Timestamp.parse(input, 'invalid')).toThrow();
});
