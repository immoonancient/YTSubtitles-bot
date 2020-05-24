const Timeline = require('./timeline.js');
const Unicode = require('unicode-properties');

// TODO: Should tokenize before parsing

function isEmptyLine(line) {
  return line === '' || line === '#';
}

// Contents allowed within a Subtitles object:
// - URL
// - TitleSection
// - DescriptionSection
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
    captions = captions.map(line => line.startsWith('#') ? line.substring(1).trim() : line);
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
    while (lines.length) {
      if (isEmptyLine(lines[0]))
        break;

      let [nextTimeline, _] = this.parseTimeline(lines, format);
      if (nextTimeline)
        break;

      captions.push(lines[0]);
      lines = lines.slice(1);
    }

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

    let engLineStart = findFirstEnglishLine(captions);
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
    while (lines.length && isEmptyLine(lines[0]))
      lines = lines.slice(1);
    while (lines.length) {
      if (isEmptyLine(lines[0]))
        break;
      let [timeline, _] = Subtitle.parseTimeline(lines, format);
      if (timeline)
        break;

      let line = lines[0];
      if (line.startsWith('#'))
        line = line.substring(1).trim();

      if (comments.length) {
        if (line.startsWith('标题') || line.startsWith('简介') || line.startsWith('字幕'))
          break;
      }

      comments.push(line);
      lines = lines.slice(1);
    }
    if (!comments.length)
      return [null, lines];
    return [new CommentSection(comments), lines];
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

  static tooLongMarker() {
    if (!TitleSection.TOO_LONG_MARKER) {
      const placeholder = 'title should not be longer than this line';
      const leftLength = Math.floor((100 - 4 - placeholder.length) / 2);
      const rightLength = 100 - 4 - placeholder.length - leftLength;
      TitleSection.TOO_LONG_MARKER = `# |${'-'.repeat(leftLength)} ${placeholder} ${'-'.repeat(rightLength)}|`;
    }
    return TitleSection.TOO_LONG_MARKER;
  }

  // Return value: [parsed_title, remaining_lines]
  static parse(lines, format) {
    const originalLines = lines;
    let titleDetected = false;
    const titleLines = [];
    while (lines.length) {
      const [nextSection, nextLines] = CommentSection.parse(lines, format);
      if (!nextSection)
        break;

      let currentLines = nextSection.lines;
      if (currentLines[0] === '简介' || currentLines[0] === '字幕')
        break;
      if (!titleDetected && !currentLines[0].startsWith('标题'))
        break;
      if (currentLines[0].startsWith('标题')) {
        titleDetected = true;
        currentLines = currentLines.slice(1);
      }

      titleLines.push(...currentLines.filter(line => line !== TitleSection.tooLongMarker()));
      lines = nextLines;
    }
    if (!titleDetected || !titleLines.length)
      return [null, originalLines];
    return [new TitleSection(titleLines), lines];
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
      TitleSection.tooLongMarker()
    ];
  }
};

class DescriptionSection {
  constructor(sections) {
    this.sections = sections || [];
  }

  // Return value: [parsed_section, remaining_lines]
  static parse(lines, format) {
    const originalLines = lines;
    const sections = [];
    let descriptionDetected = false;
    while(lines.length) {
      const [nextSection, nextLines] = CommentSection.parse(lines, format);
      if (!nextSection)
        break;
      if (nextSection.lines[0] === '字幕')
        break;
      if (!descriptionDetected && nextSection.lines[0] !== '简介')
        break;

      lines = nextLines;
      if (nextSection.lines[0] === '简介') {
        descriptionDetected = true;
        nextSection.lines = nextSection.lines.slice(1);
      }
      if (!nextSection.lines.length)
        continue;
      sections.push(nextSection);
    }

    if (!descriptionDetected || !sections.length)
      return [null, originalLines];
    return [new DescriptionSection(sections), lines];
  }

  toString() {
    if (!this.sections || !this.sections.length)
      return [];

    const result = [];
    result.push('# 简介');
    this.sections.forEach(section => {
      result.push('');
      result.push(...section.toString());
    });
    return result;
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

  function canConsumeURL() {
    return !contents.length;
  }

  function canConsumeTitleSection() {
    return !contents.some(content =>
        content instanceof TitleSection ||
        content instanceof DescriptionSection ||
        content instanceof Subtitle);
  }

  function canConsumeDescriptionSection() {
    return !contents.some(content =>
        content instanceof DescriptionSection ||
        content instanceof Subtitle);
  }

  while (lines.length) {
    if (isEmptyLine(lines[0])) {
      lines = lines.slice(1);
      continue;
    }

    if (canConsumeURL()) {
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

    if (canConsumeTitleSection()) {
      let [title, next] = TitleSection.parse(lines, format);
      if (title) {
        contents.push(title);
        lines = next;
        continue;
      }
    }

    if (canConsumeDescriptionSection()) {
      let [description, next] = DescriptionSection.parse(lines, format);
      if (description) {
        contents.push(description);
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

  // console.log(contents);

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
    TitleSection: TitleSection,
    convertPassageIntoLines: convertPassageIntoLines,
    fuzzyParse: fuzzyParse
  }
};