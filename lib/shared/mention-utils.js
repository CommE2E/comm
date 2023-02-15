// @flow

import SearchIndex from './search-index.js';
import { threadOtherMembers } from './thread-utils.js';
import { stringForUserExplicit } from './user-utils.js';
import type { RelativeMemberInfo } from '../types/thread-types.js';

export type TypeaheadMatchedStrings = {
  +textBeforeAtSymbol: string,
  +usernamePrefix: string,
};

export type Selection = {
  +start: number,
  +end: number,
};

function getTypeaheadRegexMatches(
  text: string,
  selection: Selection,
  regex: RegExp,
): null | RegExp$matchResult {
  if (
    selection.start === selection.end &&
    (selection.start === text.length || /\s/.test(text[selection.end]))
  ) {
    return text.slice(0, selection.start).match(regex);
  }
  return null;
}

function getTypeaheadUserSuggestions(
  userSearchIndex: SearchIndex,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  viewerID: ?string,
  usernamePrefix: string,
): $ReadOnlyArray<RelativeMemberInfo> {
  const userIDs = userSearchIndex.getSearchResults(usernamePrefix);
  const usersInThread = threadOtherMembers(threadMembers, viewerID);

  return usersInThread
    .filter(user => usernamePrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    );
}

function getNewTextAndSelection(
  textBeforeAtSymbol: string,
  entireText: string,
  usernamePrefix: string,
  user: RelativeMemberInfo,
): {
  newText: string,
  newSelectionStart: number,
} {
  const totalMatchLength =
    textBeforeAtSymbol.length + usernamePrefix.length + 1; // 1 for @ char

  let newSuffixText = entireText.slice(totalMatchLength);
  newSuffixText = (newSuffixText[0] !== ' ' ? ' ' : '') + newSuffixText;

  const newText =
    textBeforeAtSymbol + '@' + stringForUserExplicit(user) + newSuffixText;

  const newSelectionStart = newText.length - newSuffixText.length + 1;

  return { newText, newSelectionStart };
}

export {
  getTypeaheadUserSuggestions,
  getNewTextAndSelection,
  getTypeaheadRegexMatches,
};
