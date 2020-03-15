const source = 'https://immoonancient.github.io/YTSubtitles/static/data/translation-table.json';
const fetch = require('node-fetch');

class Hinter {
  constructor(categories, terms) {
    this.categories = categories;
    this.terms = terms;
  }

  static async create() {
    try {
      const response = await fetch(source);
      const json = await response.json();
      return new Hinter(json.categories, json.terms);
    } catch (e) {
      return null;
    }
  }

  getHints(passage, channel) {
    // This is not optimal algorithm. No plan to optimize.
    let result = {};
    let empty = true;
    while (passage.length) {
      let longestMatch = '';
      let matchedTerms = [];
      for (let term of this.terms) {
        if (term.channel && channel !== term.channel)
          continue;
        let cn = term.cn;
        if (passage.startsWith(cn)) {
          if (!longestMatch || cn.length > longestMatch.length) {
            longestMatch = cn;
            matchedTerms = [];
          }
          if (cn === longestMatch)
            matchedTerms.push(term);
        }
      }
      if (!longestMatch) {
        passage = passage.substring(1);
        continue;
      }
      if (!result.longestMatch)
        result[longestMatch] = [];
      for (let term of matchedTerms) {
        if (result[longestMatch].indexOf(term) === -1)
          result[longestMatch].push(term);
      }
      passage = passage.substring(longestMatch.length);
      empty = false;
    }

    if (empty)
      return null;
    return result;
  }
};

module.exports = Hinter;
