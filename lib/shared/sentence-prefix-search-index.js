// @flow

import Tokenizer from 'tokenize-text';

import SearchIndex from './search-index.js';

class SentencePrefixSearchIndex extends SearchIndex {
  entries: Set<string>;

  constructor() {
    super();
    this.tokenize = new Tokenizer().re(/\S+/);
    this.entries = new Set();
  }

  addEntry(id: string, rawText: string) {
    const keywords = this.tokenize(rawText);
    for (const keyword of keywords) {
      const value = rawText.slice(keyword.index).toLowerCase();
      this.addAllPrefixes(id, value);
    }
    this.entries.add(id);
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
