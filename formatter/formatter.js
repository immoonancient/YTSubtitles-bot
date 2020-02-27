const Timeline = require('./timeline.js');

// Table 12-2, Blocks Containing Han Ideographs
// http://www.unicode.org/versions/Unicode5.0.0/ch12.pdf
const REGEX_CHINESE = /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;

function hasChinese(str) {
  return REGEX_CHINESE.test(str);
}

function isEmptyLine(line) {
  return line === '' || line === '#';
}

// Contents allowed within a Subtitles object:
// - URL
// - CommentSection
// - Subtitle

class URL {
  constructor(url) {
    this.url = url;
  }

  toString() {
    return [`# ${this.url}`];
  }

  static parse(line) {
    line = line || '';
    if (line.startsWith('#'))
      line = line.substring(1);
    line = line.trim();
    if (line.startsWith('https://www.youtube.com/watch?v=') || line.startsWith('https://youtu.be/'))
      return new URL(line);
    return null;
  }
};

class Subtitle {
  constructor(timeline, captions, start) {
    this.timeline = timeline || new Timeline();
    if (!Array.isArray(captions))
      captions = [captions];
    this.captions = captions.filter(line => typeof line === 'string');
    this.engLineStart = start || 0;
    if (this.engLineStart > this.captions.length)
      this.engLineStart = this.captions.length;
  }

  // Return value: [parsed_timeline, remaining_lines]
  static parseTimeline(lines, format) {
    if (format === 'srt') {
      if (!lines.length)
        return [null, lines];
      // Make the subtitle id line optional, as some submissions remove the line
      if (lines[0].match(/^\d+$/))
        lines = lines.slice(1);
    }

    if (!lines.length)
      return [null, lines];
    let timeline = Timeline.parse(lines[0], format);
    if (timeline)
      return [timeline, lines.slice(1)];
    return [null, lines];
  }

  // Return value: [parsed_subtitle, remaining_lines]
  static parse(lines, format) {
    let [timeline, next] = this.parseTimeline(lines, format);
    if (!timeline)
      return [null, lines];
    lines = next;

    let captions = [];
    let engLineStart = 0;
    while (lines.length) {
      if (isEmptyLine(lines[0]))
        break;

      let [nextTimeline, _] = this.parseTimeline(lines, format);
      if (nextTimeline)
        break;

      let line = lines[0];
      lines = lines.slice(1);
      if (engLineStart === captions.length && line.startsWith('#')) {
        line = line.substring(1).trim();
        ++engLineStart;
      }
      if (hasChinese(line)) {
        ++engLineStart;
      }
      captions.push(line);
    }

    return [new Subtitle(timeline, captions, engLineStart), lines];
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
  static parse(lines, format) {
    let comments = [];
    while (lines.length) {
      if (isEmptyLine(lines[0]))
        break;
      let [timeline, _] = Subtitle.parseTimeline(lines, format);
      if (timeline)
        break;
      let line = lines[0];
      lines = lines.slice(1);
      if (line.startsWith('#'))
        line = line.substring(1).trim();
      comments.push(line);
    }
    if (!comments.length)
      return [null, lines];
    return [new CommentSection(comments), lines];
  }

  toString() {
    return this.lines.map(line => `# ${line}`);
  }
};

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
  while (lines.length) {
    if (isEmptyLine(lines[0])) {
      lines = lines.slice(1);
      continue;
    }

    if (!contents.length) {
      let url = URL.parse(lines[0]);
      if (url) {
        contents.push(url);
        lines = lines.slice(1);
        continue;
      }
    }

    {
      let [subtitle, next] = Subtitle.parse(lines, format);
      if (subtitle) {
        contents.push(subtitle);
        lines = next;
        continue;
      }
    }

    let [comments, next] = CommentSection.parse(lines, format);
    if (comments)
      contents.push(comments);
    lines = next;
  }

  if (!(contents[0] instanceof URL))
    contents.splice(0, 0, new URL(url));

  return contents;
}

function parsePlainText(lines, url) {
  const contents = [];
  contents.push(url);
  contents.push('');

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

function addRoute(router, path) {
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

module.exports = {
  format: formatSubtitles,
  testFormat: testFormat,
  addRoute: addRoute,
  testing: {
    CommentSection: CommentSection,
    Subtitle: Subtitle,
    Subtitles: Subtitles,
    convertPassageIntoLines: convertPassageIntoLines,
    fuzzyParse: fuzzyParse
  }
};
