const Timeline = require('./timeline.js');
const Timestamp = require('./timestamp.js');
const Unicode = require('unicode-properties');
const Tokenizer = require('./tokenizer.js');

// Contents allowed within a Subtitles object:
// - URL
// - TitleSection
// - DescriptionSection
// - CommentSection
// - Subtitle
// - ImportInstruction
// - ShiftInstruction

class URL {
  constructor(url) {
    this.url = url;
  }

  toString() {
    return [`# ${this.url}`];
  }

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.URLToken)
      return [null, tokens];
    return [new URL(tokens[0].value), tokens.slice(1)];
  }
};

class Subtitle {
  constructor(timeline, captions, start) {
    this.timeline = timeline || new Timeline();
    if (!Array.isArray(captions))
      captions = [captions];
    captions = captions.map(line => line.startsWith('#') ? line.substring(1).trim() : line);
    this.captions = captions.filter(line => typeof line === 'string');
    this.engLineStart = start || 0;
    if (this.engLineStart > this.captions.length)
      this.engLineStart = this.captions.length;
  }

  // Return value: [parsed_subtitle, remaining_lines]
  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.TimelineToken)
      return [null, tokens];

    function findFirstEnglishLine(lines) {
      if (lines.length === 0)
        return 0;

      // TODO: report uncertainties

      // Assume there's always at least one Chinese line
      // When there are two lines, assume the second line is English
      let result = 1;
      if (lines.length <= 2)
        return result;

      for (let i = 1; i < lines.length; ++i) {
        let line = lines[i];
        let eng = 0;
        let han = 0;
        let other = 0;
        if (line.indexOf('#') !== -1)
          line = line.substring(line.indexOf('#')).trim();
        for (let ch of line) {
          let script = Unicode.getScript(ch.charCodeAt(0));
          if (script === 'Han')
            ++han;
          else if (script === 'Latin')
            ++eng;
          else
            ++other;
        }
        // Heuristic that should work most of the time
        if (han * 2 > line.length || eng * 10 < line.length)
          ++result;
        else
          break;
      }
      return result;
    }

    const timeline = tokens.shift().value;

    let captions = [];
    while (tokens.length && tokens[0].type == Tokenizer.types.TextLineToken)
      captions.push(tokens.shift().value);
    let engLineStart = findFirstEnglishLine(captions);
    return [new Subtitle(timeline, captions, engLineStart), tokens];
  }

  toString(format, id) {
    const result = [];
    if (format === 'srt')
      result.push(`${id}`);
    result.push(this.timeline.toString(format));
    for (let i = 0; i < this.engLineStart; ++i)
      result.push(`# ${this.captions[i]}`);
    for (let i = this.engLineStart; i < this.captions.length; ++i)
      result.push(this.captions[i]);
    return result;
  }
};


class CommentSection {
  constructor(lines) {
    this.lines = lines || [];
  }

  // Return value: [parsed_comments, remaining_lines]
  static parse(tokens) {
    let comments = [];
    let i = 0;
    for (; i < tokens.length && tokens[i].type === Tokenizer.types.TextLineToken; ++i)
      comments.push(tokens[i].value);
    if (!comments.length)
      return [null, tokens];
    return [new CommentSection(comments), tokens.slice(i)];
  }

  toString() {
    return this.lines.map(line => `# ${line}`);
  }
};

class TitleSection {
  constructor(lines) {
    this.lines = lines || [];
    this.tooLong = this.lines.some(line => line.length > 100);
  }

  // Return value: [parsed_title, remaining_lines]
  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Title)
      return [null, tokens];

    const lines = [];

    let i = 1;
    for (; i < tokens.length && lines.length < 2; ++i) {
      if (tokens[i].type === Tokenizer.types.EmptyLineToken)
        continue;
      if (tokens[i].type === Tokenizer.types.TextLineToken) {
        lines.push(tokens[i].value);
        continue;
      }
      break;
    }
    if (i < tokens.length && tokens[i].type === Tokenizer.types.TitleTooLongMarkToken)
      ++i;

    if (!lines.length)
      return [null, tokens];
    return [new TitleSection(lines), tokens.slice(i)];
  }

  toString() {
    if (!this.lines || !this.lines.length)
      return [];

    if (!this.tooLong) {
      return [
        '# 标题',
        ...this.lines.map(line => `# ${line}`)
      ];
    }

    return [
      '# 标题 （标题翻译过长，请将其精简到 100 字符内）',
      ...this.lines.map(line => `# ${line}`),
      `# ${Tokenizer.TitleTooLongMarkString}`
    ];
  }
};

class DescriptionSection {
  constructor(sections) {
    this.sections = sections || [];
  }

  // Return value: [parsed_section, remaining_lines]
  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Description)
      return [null, tokens];

    const lines = [];

    let i = 1;
    let needsEmptyLine = false;
    for (; i < tokens.length; ++i) {
      if (tokens[i].type === Tokenizer.types.TextLineToken) {
        if (needsEmptyLine) {
          lines.push('');
          needsEmptyLine = false;
        }
        lines.push(tokens[i].value);
        continue;
      }

      if (tokens[i].type === Tokenizer.types.EmptyLineToken) {
        if (lines.length)
          needsEmptyLine = true;
        continue;
      }
      break;
    }

    if (!lines.length)
      return [null, tokens];
    return [new DescriptionSection(lines), tokens.slice(i)];
  }

  toString() {
    if (!this.sections || !this.sections.length)
      return [];

    const result = [];
    result.push('# 简介');
    result.push('');
    this.sections.forEach(section => {
      result.push(section.length ? `# ${section}` : '');
    });
    return result;
  }
};

class ImportInstruction {
  constructor(path) {
    this.path = path;
  }

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Import)
      return [null, tokens];
    const params = tokens[0].controlParameters;
    if (!params.length)
      return [null, tokens];
    return [new ImportInstruction(params[0]), tokens.slice(1)];
  }

  toString() {
    return [`# import ${this.path}`];
  }
};

class ShiftInstruction {
  constructor(direction, delta) {
    this.direction = direction;
    this.delta = delta;
  }

  static parse(tokens, format) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Import)
      return [null, tokens];
    const params = tokens[0].controlParameters;
    if (params.length < 2)
      return [null, tokens];
    const direction = params[0];
    if (direction !== 'forward' && direction !== 'backward')
      return [null, tokens];
    const [delta, _] = Timestamp.parse(params[1], format);
    if (!delta)
      return [null, tokens];
    return [new ShiftInstruction(direction, delta), tokens.slice(1)];
  }

  toString(format) {
    return [`# shift ${this.direction} ${this.delta.toString(format)}`];
  }
};

class SubtitleStartMark {
  constructor() {}

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Subtitles)
      return [null, tokens];
    return [new SubtitleStartMark(), tokens.slice(1)];
  }

  toString() {
    return [`# 字幕`];
  }
}

class Subtitles {
  constructor(contents) {
    this.contents = contents || [];
  }

  toString(format) {
    let subtitleId = 0;
    let result = [];
    for (let content of this.contents) {
      if (result.length)
        result.push('');
      if (content instanceof Subtitle)
        ++subtitleId;
      result.push(...content.toString(format, subtitleId));
    }
    return result;
  }
};

function fuzzyParse(lines, url, format) {
  const contents = [];
  let tokens = Tokenizer.tokenize(lines, format);

  function consumeEmptyLines() {
    let result = false;
    while (tokens.length && tokens[0].type == Tokenizer.types.EmptyLineToken) {
      tokens.shift();
      result = true;
    }
    return result;
  }

  function tryConsume(contentType, format) {
    consumeEmptyLines();
    if (!tokens.length)
      return false;
    let [content, next] = contentType.parse(tokens, format);
    if (!content)
      return false;
    contents.push(content);
    tokens = next;
    return true;
  }

  if (!tryConsume(URL))
    contents.push(new URL(url));

  tryConsume(TitleSection);
  tryConsume(DescriptionSection);
  tryConsume(ImportInstruction);
  tryConsume(SubtitleStartMark);

  while (tokens.length) {
    if (tryConsume(Subtitle))
      continue;
    if (tryConsume(ImportInstruction))
      continue;
    if (tryConsume(ShiftInstruction, format))
      continue;
    if (tryConsume(CommentSection))
      continue;

    // Reach here for lines like '# 字幕'
    tokens.shift();
  }

  // console.log(contents);

  return contents;
}

function parsePlainText(lines, url) {
  const contents = [];
  contents.push(url);
  contents.push('');

  function isEmptyLine(line) {
    return line === '' || line === '#';
  }

  let awaitingURL = true;
  for (; lines.length; lines = lines.slice(1)) {
    if (awaitingURL && URL.parse(lines[0])) {
      awaitingURL = false;
      continue;
    }

    if (isEmptyLine(lines[0])) {
      if (contents.length && !isEmptyLine(contents[contents.length - 1]))
        contents.push('');
      continue;
    }

    contents.push(lines[0]);
  }
  return contents;
}

function convertPassageIntoLines(passage) {
  return passage
    .replace(new RegExp('\u2028', 'ug'), '\n')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim());
}

function formatSubtitles(passage, url) {
  const lines = convertPassageIntoLines(passage);

  for (let format of ['sbv', 'srt']) {
    let contents = fuzzyParse(lines, url, format);
    if (contents.some(content => content instanceof Subtitle))
      return new Subtitles(contents).toString(format);
  }

  return parsePlainText(lines, url);
}

function testFormat(passage) {
  const lines = convertPassageIntoLines(passage);
  for (let format of ['sbv', 'srt']) {
    let contents = fuzzyParse(lines, undefined, format);
    if (contents.some(content => content instanceof Subtitle))
      return format;
  }
  return undefined;
}

function addRoutePlainText(router, path) {
  router.options(path, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.sendStatus(200);
  });

  router.post(path, async (req, res) => {
    const format = req.body.format;
    const video = req.body.video;
    const passage = req.body.passage;
    if (!format || !video || !passage) {
      res.sendStatus(400);
      return;
    }

    const contents = fuzzyParse(passage.split('\n'), 'https://youtu.be/' + video, format);
    const result = new Subtitles(contents).toString(format).join('\n') + '\n';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(result);
  });
}

function addRouteStructured(router, path) {
  router.options(path, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.sendStatus(200);
  });

  router.post(path, async (req, res) => {
    const format = req.body.format;
    const video = req.body.video;
    const passage = req.body.passage;
    if (!format || !video || !passage) {
      res.sendStatus(400);
      return;
    }

    const contents = fuzzyParse(passage.split('\n'), 'https://youtu.be/' + video, format);
    const result = new Subtitles(contents);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(result);
  });
}

module.exports = {
  format: formatSubtitles,
  testFormat: testFormat,
  addRoutePlainText: addRoutePlainText,
  addRouteStructured: addRouteStructured,
  testing: {
    CommentSection: CommentSection,
    Subtitle: Subtitle,
    Subtitles: Subtitles,
    TitleSection: TitleSection,
    convertPassageIntoLines: convertPassageIntoLines,
    fuzzyParse: fuzzyParse
  }
};