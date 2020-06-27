const Timestamp = require('./timestamp.js');

class Timeline {
  constructor(start, end) {
    this.start = start || new Timestamp();
    this.end = end || new Timestamp();
  }

  static getSeparator(format) {
    format = format || 'sbv';
    if (format === 'sbv')
      return ',';
    if (format === 'srt')
      return ' --> ';
    throw 'Invalid format';
  }

  static parse(input, format) {
    input = (input || '').trim();

    let start;
    [start, input] = Timestamp.parse(input, format);
    if (!start)
      return null;

    const separator = this.getSeparator(format);;
    if (!input.startsWith(separator))
      return null;
    input = input.substring(separator.length);

    let end;
    [end, input] = Timestamp.parse(input, format);
    if (!end)
      return null;

    if (input !== '')
      return null;

    return new Timeline(start, end);
  }

  toString(format) {
    return [
      this.start.toString(format),
      this.constructor.getSeparator(format),
      this.end.toString(format)
    ].join('');
  }

  isValid() {
    return this.start.valueOf() < this.end.valueOf();
  }
};

module.exports = Timeline;