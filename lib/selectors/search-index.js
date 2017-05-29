// @flow

import type { BaseAppState } from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';

import Tokenizer from 'tokenize-text';
import { createSelector } from 'reselect';

import * as TypeaheadText from '../shared/typeahead-text';
import { currentNavID, subscriptionExists } from './nav-selectors';

type Token = {
  index: number,
  match: {
    [i: number]: string,
    index: number,
    input: string,
  },
  offset: number,
  value: string,
}

class SearchIndex {

  tokenize: (str: string) => Token[];
  fullTextIndex: {[token: string]: Set<string>};
  partialTextIndex: {[token: string]: Set<string>};

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
      let partialString = "";
      for (const char of value) {
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
    const fullKeywords = keywords.
      slice(0, -1).
      map((k) => k.value.toLowerCase());

    let possibleMatches = Array.from(lastMatchSet);
    for (const keyword of fullKeywords) {
      const fullMatches = this.fullTextIndex[keyword];
      if (!fullMatches) {
        return [];
      }
      possibleMatches = possibleMatches.filter(
        (navID) => fullMatches.has(navID)
      );
      if (possibleMatches.length === 0) {
        return [];
      }
    }

    return possibleMatches;
  }

}

const searchIndex = createSelector(
  (state: BaseAppState) => state.threadInfos,
  subscriptionExists,
  currentNavID,
  (state: BaseAppState) => state.navInfo.threadID,
  (
    threadInfos: {[id: string]: ThreadInfo},
    subscriptionExists: bool,
    currentNavID: ?string,
    currentThreadID: ?string,
  ) => {
    const searchIndex = new SearchIndex();
    if (currentThreadID && !threadInfos[currentThreadID]) {
      searchIndex.addEntry(
        currentThreadID,
        TypeaheadText.secretText,
      );
    }
    searchIndex.addEntry("home", TypeaheadText.homeText);
    for (const threadID in threadInfos) {
      const thread = threadInfos[threadID];
      searchIndex.addEntry(
        threadID,
        thread.name + " " + thread.description,
      );
    }
    searchIndex.addEntry("new", TypeaheadText.newText);
    return searchIndex;
  },
);

export { SearchIndex, searchIndex };
