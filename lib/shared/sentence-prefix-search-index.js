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
      this.addEntryHandler(id, value);
    }
  }

  getSearchResults(query: string): string[] {
    const possibleMatches = new Set<string>();
    const transformedQuery = query.toLowerCase();

    if (this.partialTextIndex[transformedQuery]) {
      for (const id of this.partialTextIndex[transformedQuery]) {
        possibleMatches.add(id);
      }
    }

    const slicedQuery = transformedQuery.slice(0, -1);
    if (
      query.endsWith(' ') &&
      this.fullTextIndex[slicedQuery] &&
      !this.partialTextIndex[transformedQuery]
    ) {
      for (const id of this.fullTextIndex[slicedQuery]) {
        possibleMatches.delete(id);
      }
    }

    return Array.from(possibleMatches);
  }
}

export default SentencePrefixSearchIndex;
