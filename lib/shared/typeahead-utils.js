// @flow

import type { RelativeMemberInfo } from '../types/thread-types';
import SearchIndex from './search-index';
import { threadOtherMembers } from './thread-utils';
import { stringForUserExplicit } from './user-utils';

export type TypeaheadMatchedStrings = {
  +textBeforeAtSymbol: string,
  +usernamePrefix: string,
};

export type Selection = {
  +start: number,
  +end: number,
};

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

export { getTypeaheadUserSuggestions, getNewTextAndSelection };
