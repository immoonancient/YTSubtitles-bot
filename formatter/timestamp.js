class Timestamp {
  // All parameters are strings instead of numbers
  constructor(hour, minute, second, millisecond) {
    this.hour = hour || '0';
    this.minute = minute || '00';
    this.second = second || '00';
    this.millisecond = millisecond || '000';
  }

  static parse(input, format) {
    input = input || '';
    format = format || 'sbv';
    let re;
    if (format === 'sbv')
      re = /^(\d+):(\d+):(\d+)\.(\d+)/;
    else if (format === 'srt')
      re = /^(\d+):(\d+):(\d+),(\d+)/;
    else
      throw 'Invalid format';
    let m = input.match(re);
    if (!m)
      return [null, input];
    return [
      new Timestamp(m[1], m[2], m[3], m[4]),
      input.substring(m[0].length)
    ];
  }

  toString(format) {
    format = format || 'sbv';
    if (format === 'sbv')
      return `${this.hour}:${this.minute}:${this.second}.${this.millisecond}`;
    if (format === 'srt')
      return `${this.hour}:${this.minute}:${this.second},${this.millisecond}`;
    throw 'Invalid format';
  }

  valueOf() {
    let result = parseInt(this.hour);
    result = result * 60 + parseInt(this.minute);
    result = result * 60 + parseInt(this.second);
    result = result * 1000 + parseInt(this.millisecond);
    return result;
  }
};

module.exports = Timestamp;