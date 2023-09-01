// @flow

import Tokenizer from 'tokenize-text';

import SearchIndex from './search-index.js';

class SentencePrefixSearchIndex extends SearchIndex {
  constructor() {
    super();
    this.tokenize = new Tokenizer().re(/\S+/);
  }

  addEntry(id: string, rawText: string) {
    const keywords = this.tokenize(rawText);
    for (const keyword of keywords) {
      const value = rawText.slice(keyword.index).toLowerCase();
      this.addAllPrefixes(id, value);
    }
  }

  getSearchResults(query: string): string[] {
    const transformedQuery = query.toLowerCase();
    if (this.partialTextIndex[transformedQuery]) {
      return Array.from(this.partialTextIndex[transformedQuery]);
    }
    return [];
  }
}

export default SentencePrefixSearchIndex;
