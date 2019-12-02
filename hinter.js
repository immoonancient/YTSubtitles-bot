const source = 'https://raw.githubusercontent.com/immoonancient/YTSubtitles/master/docs/translation-table.md';
const Axios = require('axios');

class Hinter {
  constructor(terms) {
    this.terms = terms;
  }

  static parseHints(document) {
    function isTableLine(line) {
      return line.startsWith('|') && line.endsWith('|') && line.length > 2;
    }

    function isTableHeaderLine(line) {
      if (!isTableLine(line))
        return false;
      if (line.indexOf('中文') !== -1)
        return true;
      if (line.match(/:-+:/))
        return true;
      return false;
    }

    let terms = {};
    document = document.split('\n');
    for (let i = 0; i < document.length; ++i) {
      const line = document[i].trim();
      if (!isTableLine(line) || isTableHeaderLine(line))
        continue;
      const match = line.match(/\|(.*)\|(.*)\|/);
      if (!match)
        continue;
      terms[match[1].trim()] = match[2].trim();
    }

    return terms;
  }

  static async create() {
    const axios = Axios.default;
    try {
      const response = await axios.get(source);
      const document = response.data;
      const terms = this.parseHints(document);
      return new Hinter(terms);
    } catch (error) {
      return null;
    }
  }

  getHints(passage) {
    // This is not optimal algorithm. No plan to optimize.
    let result = {};
    let empty = true;
    while (passage.length) {
      let best;
      for (let term in this.terms) {
        if (passage.startsWith(term)) {
          if (!best || term.length > best.length)
            best = term;
        }
      }
      if (!best) {
        passage = passage.substring(1);
        continue;
      }
      result[best] = this.terms[best];
      passage = passage.substring(best.length);
      empty = false;
    }

    if (empty)
      return null;
    return result;
  }
};

module.exports = Hinter;
