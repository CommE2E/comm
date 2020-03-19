// @flow

import Tokenizer from 'tokenize-text';

type Token = {
  index: number,
  match: {
    [i: number]: string,
    index: number,
    input: string,
  },
  offset: number,
  value: string,
};

class SearchIndex {
  tokenize: (str: string) => Token[];
  fullTextIndex: { [token: string]: Set<string> };
  partialTextIndex: { [token: string]: Set<string> };

  constructor() {
    this.tokenize = new Tokenizer().words();
    this.fullTextIndex = {};
    this.partialTextIndex = {};
  }

  addEntry(id: string, rawText: string) {
    const keywords = this.tokenize(rawText);
    for (const keyword of keywords) {
      const value = keyword.value.toLowerCase();
      if (this.fullTextIndex[value] === undefined) {
        this.fullTextIndex[value] = new Set();
      }
      this.fullTextIndex[value].add(id);
      let partialString = '';
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        partialString += char;
        // TODO probably should do some stopwords here
        if (this.partialTextIndex[partialString] === undefined) {
          this.partialTextIndex[partialString] = new Set();
        }
        this.partialTextIndex[partialString].add(id);
      }
    }
  }

  getSearchResults(query: string) {
    const keywords = this.tokenize(query);
    if (keywords.length === 0) {
      return [];
    }

    const lastKeyword = keywords[keywords.length - 1];
    const lastKeywordValue = lastKeyword.value.toLowerCase();
    const lastMatchSet = lastKeyword.match.input.match(/\S$/)
      ? this.partialTextIndex[lastKeywordValue]
      : this.fullTextIndex[lastKeywordValue];
    if (!lastMatchSet) {
      return [];
    }
    const fullKeywords = keywords.slice(0, -1).map(k => k.value.toLowerCase());

    let possibleMatches: string[] = Array.from(lastMatchSet);
    for (const keyword of fullKeywords) {
      const fullMatches = this.fullTextIndex[keyword];
      if (!fullMatches) {
        return [];
      }
      possibleMatches = possibleMatches.filter(id => fullMatches.has(id));
      if (possibleMatches.length === 0) {
        return [];
      }
    }

    return possibleMatches;
  }
}

export default SearchIndex;
