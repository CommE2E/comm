// @flow

import Tokenizer from 'tokenize-text';

import RadixTree from './radix-tree.js';

type Token = {
  index: number,
  match: {
    [i: number]: string,
    index: number,
    input: string,
    ...
  },
  offset: number,
  value: string,
  ...
};

type TokenizeFunc = (str: string) => Token[];
const defaultTokenize: TokenizeFunc = new Tokenizer().words();

class SearchIndex {
  tokenize: (str: string) => Token[];
  radixTree: RadixTree<string> = new RadixTree<string>();

  constructor(inputTokenize?: TokenizeFunc) {
    this.tokenize = inputTokenize ?? defaultTokenize;
  }

  addAllPrefixes(id: string, value: string): void {
    this.radixTree.add(value, id);
  }

  addEntry(id: string, rawText: string) {
    const keywords = this.tokenize(rawText);
    for (const keyword of keywords) {
      const value = keyword.value.toLowerCase();
      this.addAllPrefixes(id, value);
    }
  }

  getSearchResults(query: string): string[] {
    const keywords = this.tokenize(query);
    if (keywords.length === 0) {
      return [];
    }

    const lastKeyword = keywords[keywords.length - 1];
    const lastKeywordValue = lastKeyword.value.toLowerCase();
    const lastMatchSet = lastKeyword.match.input.match(/\S$/)
      ? this.radixTree.getAllMatchingPrefix(lastKeywordValue)
      : this.radixTree.getAllMatchingExactly(lastKeywordValue);
    if (lastMatchSet.length === 0) {
      return [];
    }
    const fullKeywords = keywords.slice(0, -1).map(k => k.value.toLowerCase());

    let possibleMatches = lastMatchSet;
    for (const keyword of fullKeywords) {
      const fullMatches = this.radixTree.getAllMatchingExactly(keyword);
      if (fullMatches.length === 0) {
        return [];
      }
      const fullMatchesSet = new Set(fullMatches);
      possibleMatches = possibleMatches.filter(id => fullMatchesSet.has(id));
      if (possibleMatches.length === 0) {
        return [];
      }
    }

    return possibleMatches;
  }
}

export default SearchIndex;
