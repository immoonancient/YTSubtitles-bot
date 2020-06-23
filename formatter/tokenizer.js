const Timeline = require('./timeline.js');

function trimCommentMark(line) {
  if (!line.startsWith('#'))
    return line;
  return line.substring(1).trim();
}

const TokenTypes = {
  EmptyLineToken: 'EmptyLine',
  URLToken: 'URL',
  TimelineToken: 'Timeline',
  TextLineToken: 'TextLine',
  TitleTooLongMarkToken: 'TitleTooLongMark',
  ControlToken: 'Control',
  BadToken: 'Bad'
};

class Token {
  constructor(lines, value) {
    this.lines = lines;
    this.value = value;
  }

  get type() {
    throw 'Token.type called on abstract class';
  }

  get linesWithoutCommentMarks() {
    return this.lines.map(trimCommentMark);
  }
};

class EmptyLineToken extends Token {
  constructor(lines) {
    super(lines, '');
  }

  get type() {
    return TokenTypes.EmptyLineToken;
  }
};

class URLToken extends Token {
  constructor(lines, url) {
    super(lines, url);
  }

  get type() {
    return TokenTypes.URLToken;
  }
};

class TimelineToken extends Token {
  constructor(lines, timeline) {
    super(lines, timeline);
  }

  get type() {
    return TokenTypes.TimelineToken;
  }
};

class TextLineToken extends Token {
  constructor(lines) {
    super(lines, trimCommentMark(lines[0]));
  }

  get type() {
    return TokenTypes.TextLineToken;
  }

  get hasCommentMark() {
    return this.lines[0].startsWith('#');
  }
};

const TitleTooLongMarkString = function() {
  const placeholder = 'title should not be longer than this line';
  const leftLength = Math.floor((100 - 4 - placeholder.length) / 2);
  const rightLength = 100 - 4 - placeholder.length - leftLength;
  return `|${'-'.repeat(leftLength)} ${placeholder} ${'-'.repeat(rightLength)}|`;
}();

class TitleTooLongMarkToken extends Token {
  constructor(lines) {
    super(lines, TitleTooLongMarkString);
  }

  get type() {
    return TokenTypes.TitleTooLongMarkToken;
  }
};

const ControlKeywords = {
  Import: 'import',
  Shift: 'shift',
  Title: '标题',
  Description: '简介',
  Subtitles: '字幕',
};

class ControlToken extends Token {
  constructor(lines, parameters) {
    super(lines, parameters);
  }

  get type() {
    return TokenTypes.ControlToken;
  }

  get controlType() {
    return this.value[0];
  }

  get controlParameters() {
    return this.value.slice(1);
  }
};

class BadToken extends Token {
  constructor(lines) {
    super(lines);
  }

  get type() {
    return TokenTypes.BadToken;
  }
}

class Tokenizer {
  constructor(lines, format) {
    this.lines = lines;
    this.format = format;
    this.result = [];
  }

  tokenize() {
    while (this.lines.length) {
      if (this._consumeEmptyLineToken())
        continue;

      if (this._consumeURLToken())
        continue;

      if (this._consumeControlToken())
        continue;

      if (this._consumeTitleTooLongMarkToken())
        continue;

      if (this._consumeTimelineToken())
        continue;

      if (this._consumeTextLineToken())
        continue;

      this._createTokenWithFirstLine(BadToken);
    }
    return this.result;
  }

  _hasMoreLines() {
    return this.lines && this.lines.length;
  }

  _createTokenWithFirstLine(token, value) {
    this.result.push(new token([this.lines[0]], value));
    this.lines = this.lines.slice(1);
  }

  _consumeEmptyLineToken() {
    if (trimCommentMark(this.lines[0]) !== '')
      return;
    this._createTokenWithFirstLine(EmptyLineToken);
    return true;
  }

  _consumeURLToken() {
    const line = trimCommentMark(this.lines[0]);
    if (!line.startsWith('https://www.youtube.com/watch?v=') && !line.startsWith('https://youtu.be/'))
      return;
    this._createTokenWithFirstLine(URLToken, line);
    return true;
  }

  _consumeTimelineToken() {
    let lines = this.lines;
    let hasNumberLine = false;
    if (this.format === 'srt') {
      if (!lines.length)
        return;
      // Make the subtitle id line optional, as some submissions remove the line
      if (lines[0].match(/^\d+$/)) {
        lines = lines.slice(1);
        hasNumberLine = true;
      }
    }

    if (!lines.length)
      return;
    let timeline = Timeline.parse(lines[0], this.format);
    if (!timeline)
      return;

    const endIndex = hasNumberLine ? 2 : 1;
    this.result.push(new TimelineToken(this.lines.slice(0, endIndex), timeline));
    this.lines = this.lines.slice(endIndex);
    return true;
  }

  _consumeControlToken() {
    const words = trimCommentMark(this.lines[0]).split(' ');
    if (!Object.entries(ControlKeywords).some(kv => words[0] === kv[1]))
      return;
    this._createTokenWithFirstLine(ControlToken, words);
    return true;
  }

  _consumeTitleTooLongMarkToken() {
    const line = trimCommentMark(this.lines[0]);
    if (line !== TitleTooLongMarkString)
      return;
    this._createTokenWithFirstLine(TitleTooLongMarkToken);
    return true;
  }

  _consumeTextLineToken() {
    if (trimCommentMark(this.lines[0]) === '')
      return;
    this._createTokenWithFirstLine(TextLineToken);
    return true;
  }
}

function tokenize(lines, format) {
  return new Tokenizer(lines, format).tokenize();
}

const TokenClasses = {
  EmptyLineToken: EmptyLineToken,
  URLToken: URLToken,
  TimelineToken: TimelineToken,
  TextLineToken: TextLineToken,
  TitleTooLongMarkToken: TitleTooLongMarkToken,
  ControlToken: ControlToken,
  BadToken: BadToken,
};


module.exports = {
  types: TokenTypes,
  classes: TokenClasses,
  tokenize: tokenize,
  controlTypes: ControlKeywords,
  TitleTooLongMarkString: TitleTooLongMarkString
};