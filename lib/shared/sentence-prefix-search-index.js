// @flow

import Tokenizer from 'tokenize-text';

import SearchIndex from './search-index.js';

// defaultTokenize used in SearchIndex splits on punctuation
// We use this alternative because we only want to split on whitespace
const tokenize = new Tokenizer().re(/\S+/);

class SentencePrefixSearchIndex extends SearchIndex {
  entries: Set<string>;

  constructor() {
    super(tokenize);
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
    return this.radixTree.getAllMatchingPrefix(query.toLowerCase());
  }
}

export default SentencePrefixSearchIndex;
