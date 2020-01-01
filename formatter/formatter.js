const Timeline = require('./timeline.js');

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

  toString(format) {
    const result = [];
    result.push(this.timeline.toString(format));
    for (let i = 0; i < this.engLineStart; ++i)
      result.push(`# ${this.captions[i]}`);
    for (let i = this.engLineStart; i < this.captions.length; ++i)
      result.push(this.captions[i]);
    return result;
  }
};

class Subtitles {
  constructor(url, contents) {
    this.url = url || '';
    this.contents = contents || [];
  }

  toString(format) {
    format = format || 'sbv';

    class Result {
      constructor() {
        this.lines = [];
        this.lastContent = undefined;
        this.subtitleId = 0;
      }

      pushString(str) {
        if (str.startsWith('#'))
          throw 'Comment marks should have been stripped earlier';
        if (str !== str.trim())
          throw 'White spaces should have been stripped earlier';
        if (str === '')
          throw 'Empty lines should have been stripped earlier';
        if (this.lastContent && (typeof this.lastContent !== 'string'))
          this.lines.push('');
        this.lines.push(`# ${str}`);
      }

      pushSubtitle(subtitle) {
        if (this.lastContent)
          this.lines.push('');
        ++this.subtitleId;
        if (format === 'srt')
          this.lines.push(`${this.subtitleId}`);
        this.lines.push(...subtitle.toString(format));
      }

      push(content) {
        if (typeof content === 'string')
          this.pushString(content);
        else if (content instanceof Subtitle)
          this.pushSubtitle(content);
        else
          throw 'Invalid content in subtitles';
        this.lastContent = content;
      }

      toString() {
        return this.lines;
      }
    };

    const result = new Result();
    for (let content of this.contents)
      result.push(content);
    return result.toString();
  }

};

function trimLine(line) {
  if (line.startsWith('#'))
    line = line.substring(1);
  line = line.trim();
  return line;
}

function trySkipURLHeader(lines) {
  for (let i = 0; i < lines.length; ++i) {
    const line = trimLine(lines[i]);
    if (line.startsWith('https://www.youtube.com/watch?v=') || line.startsWith('https://youtu.be/'))
      return lines.slice(i + 1);
  }
  return lines;
}


// Try parse into the specified format with error tolerations:
// - All lines that are not part of a subtitle are treated as comments
// - Subtitle lines are lines from a timeline to the next timeline or empty line
// - Empty lines are parsed and then discarded
function fuzzyParse(lines, format) {
  // Return value: [is_empty_line, remaining_lines]
  function tryParseEmptyLine(lines) {
    if (!lines.length)
      return [false, []];
    const line = trimLine(lines[0]);
    if (line === '')
      return [true, lines.slice(1)];
    return [false, lines];
  }

  // Return value: [parsed_timeline, remaining_lines]
  function tryParseTimeline(lines) {
    if (format === 'srt') {
      if (lines.length < 2)
        return [null, lines];
      if (!lines[0].match(/^\d+$/))
        return [null, lines];
      let timeline = Timeline.parse(lines[1], format);
      if (timeline)
        return [timeline, lines.slice(2)];
      return [null, lines];
    }

    if (!lines.length)
      return [null, lines];
    let timeline = Timeline.parse(lines[0], format);
    if (timeline)
      return [timeline, lines.slice(1)];
    return [null, lines];
  }

  // Return value: [parsed_subtitle, remaining_lines]
  function tryParseSubtitle(lines) {
    let [timeline, next] = tryParseTimeline(lines);
    if (!timeline)
      return [null, lines];

    let captions = [];
    let engLineStart = 0;
    while (next.length) {
      let parsed;
      let end;

      [parsed, end] = tryParseEmptyLine(next);
      if (parsed) {
        next = end;
        break;
      }

      [parsed, end] = tryParseTimeline(next);
      if (parsed)
        break;

      let line = next[0];
      next = next.slice(1);
      if (engLineStart === captions.length && line.startsWith('#')) {
        line = trimLine(line);
        ++engLineStart;
      }
      captions.push(line);
    }

    // Heuristic: if there are multiple captions lines, while no line starts with '#',
    // assume that the first line is the Chinese line
    if (captions.length > 1 && engLineStart == 0)
      engLineStart = 1;

    return [new Subtitle(timeline, captions, engLineStart), next];
  }

  const contents = [];
  for (let next; lines.length; lines = next) {
    // TODO: Do not remove all empty lines. Preserve an empty line if it serves as a meaningful paragraph break.
    
    let empty;
    [empty, next] = tryParseEmptyLine(lines);
    if (empty)
      continue;

    let subtitle;
    [subtitle, next] = tryParseSubtitle(lines);
    if (subtitle) {
      contents.push(subtitle);
      continue;
    }

    contents.push(trimLine(lines[0]));
    next = lines.slice(1);
  }
  return contents;
}

function convertPassageIntoLines(passage) {
  const re = new RegExp('\u2028', 'ug');
  return passage
    .replace(re, '\n')
    .split('\n')
    .map(line => line.trim());
}

function formatSubtitles(passage, url) {
  let lines = convertPassageIntoLines(passage);
  lines = trySkipURLHeader(lines);

  // Original lines as the default result when no subtitle format can be identified
  let result = lines;
  for (let format of ['sbv', 'srt']) {
    let contents = fuzzyParse(lines, format);
    if (!contents.some(content => content instanceof Subtitle))
      continue;
    result = new Subtitles(url, contents).toString(format);
  }

  return [`# ${url}`, '', ...result];
}

module.exports = {
  format: formatSubtitles,
  testing: {
    Subtitle: Subtitle,
    convertPassageIntoLines: convertPassageIntoLines,
    fuzzyParse: fuzzyParse
  }
};

