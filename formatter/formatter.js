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
  constructor(url, tokens) {
    this.url = url;
    this.tokens = tokens || [];
  }

  toString() {
    return [`# ${this.url}`];
  }

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.URLToken)
      return [null, tokens];
    return [new URL(tokens[0].value, [tokens[0]]), tokens.slice(1)];
  }
};

class Subtitle {
  constructor(timeline, captions, start, tokens) {
    this.timeline = timeline || new Timeline();
    if (!Array.isArray(captions))
      captions = [captions];
    captions = captions.map(line => line.startsWith('#') ? line.substring(1).trim() : line);
    this.captions = captions.filter(line => typeof line === 'string');
    this.engLineStart = start || 0;
    if (this.engLineStart > this.captions.length)
      this.engLineStart = this.captions.length;
    this.tokens = tokens || [];
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

    let i = 0;
    const timeline = tokens[i++].value;

    let captions = [];
    while (i < tokens.length && tokens[i].type == Tokenizer.types.TextLineToken)
      captions.push(tokens[i++].value);
    let engLineStart = findFirstEnglishLine(captions);
    return [new Subtitle(timeline, captions, engLineStart, tokens.slice(0, i)), tokens.slice(i)];
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
  constructor(lines, tokens) {
    this.lines = lines || [];
    this.tokens = tokens || []
  }

  // Return value: [parsed_comments, remaining_lines]
  static parse(tokens) {
    let comments = [];
    let i = 0;
    for (; i < tokens.length && tokens[i].type === Tokenizer.types.TextLineToken; ++i)
      comments.push(tokens[i].value);
    if (!comments.length)
      return [null, tokens];
    return [new CommentSection(comments, tokens.slice(0, i)), tokens.slice(i)];
  }

  toString() {
    return this.lines.map(line => `# ${line}`);
  }
};

class TitleSection {
  constructor(lines, tokens) {
    this.lines = lines || [];
    this.tokens = tokens || [];
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
    return [new TitleSection(lines, tokens.slice(0, i)), tokens.slice(i)];
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
  constructor(sections, tokens) {
    this.sections = sections || [];
    this.tokens = tokens || [];
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
      if (tokens[i].type === Tokenizer.types.TextLineToken ||
          tokens[i].type === Tokenizer.types.URLToken) {
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
    return [new DescriptionSection(lines, tokens.slice(0, i)), tokens.slice(i)];
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
  constructor(path, tokens) {
    this.path = path;
    this.tokens = tokens || [];
  }

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Import)
      return [null, tokens];
    const params = tokens[0].controlParameters;
    if (!params.length)
      return [null, tokens];
    return [new ImportInstruction(params[0], tokens.slice(0, 1)), tokens.slice(1)];
  }

  toString() {
    return [`# import ${this.path}`];
  }
};

class ShiftInstruction {
  constructor(direction, delta, tokens) {
    this.direction = direction;
    this.delta = delta;
    this.tokens = tokens || [];
  }

  static parse(tokens, format) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Shift)
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
    return [new ShiftInstruction(direction, delta, tokens.slice(0, 1)), tokens.slice(1)];
  }

  toString(format) {
    return [`# shift ${this.direction} ${this.delta.toString(format)}`];
  }
};

class SubtitleStartMark {
  constructor(tokens) {
    this.tokens = tokens || [];
  }

  static parse(tokens) {
    if (!tokens.length || tokens[0].type !== Tokenizer.types.ControlToken ||
        tokens[0].controlType !== Tokenizer.controlTypes.Subtitles)
      return [null, tokens];
    return [new SubtitleStartMark(tokens.slice(0, 1)), tokens.slice(1)];
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

  // TODO: We should introduce section types, where each section consists of smaller structures
  
  // TODO: ImportInstruction should be part of DescriptionSection
  tryConsume(DescriptionSection);
  tryConsume(ImportInstruction);

  // TODO: SubtitleStartMark should be part of SubtitleSection or something similar
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

    if (!tokens.length)
      break;

    // Shouldn't reach here. Do this anyway to prevent dead loop
    tokens.shift();
  }

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

function checkFormat(file, lines, format) {
  if (format !== 'sbv' && format !== 'srt') {
    return {
      conclusion: 'neutral',
      summary: 'Not sbv or srt file',
      text: `${file.filename} is not a sbv or srt subtitle file. It is recommended to upload timed subtitle files in sbv or srt format.`,
      annotations: []
    };
  }

  const messages = [];
  const annotations = [];

  const contents = fuzzyParse(lines, '', format);

  {
    let hasTooLong = false;
    contents.filter(content => content instanceof TitleSection && content.tooLong).forEach(content => {
      hasTooLong = true;
      for (let token of content.tokens) {
        if (token.type == Tokenizer.types.TextLineToken && token.value.length > 100) {
          annotations.push({
            start_line: token.startLineNumber,
            end_line: token.startLineNumber,
            annotation_level: 'failure',
            message: 'Title translation is too long. Please shrink to within 100 characters.',
          })
        }
      }
    });
    if (hasTooLong)
      messages.push('Title is too long. Please shrink the title to within 100 characters.');
  }

  if (!contents.some(content => content instanceof Subtitle)) {
    messages.push(`Did not detect subtitles in ${format} format. Please revise or rename file.`);
  } else {
    let hasInvalidTimeline = false;
    contents.filter(content => content instanceof Subtitle && !content.timeline.isValid()).forEach(subtitle => {
      hasInvalidTimeline = true;
      const timelineToken = subtitle.tokens[0];
      const lineNumber = timelineToken.startLineNumber + timelineToken.lines.length - 1;
      annotations.push({
        start_line: lineNumber,
        end_line: lineNumber,
        annotation_level: 'failure',
        message: `Invalid timeline. Start time must be less than end time.`,
      });
    });
    if (hasInvalidTimeline)
      messages.push('File contains invalid timelines');
  }

  // TODO: Check if consecutive timelines are inorder. Need to handle # import and # shift though

  const conclusion = messages.length ? 'failure' : 'success';
  const summary = messages.length ? 'Found the following format errors' : 'Format checking passed';
  const text = messages.length ? messages.join('\n\n') : undefined;

  return {
    conclusion: conclusion,
    summary: summary,
    text: text,
    annotations: annotations,
  };
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
  checkFormat: checkFormat,
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