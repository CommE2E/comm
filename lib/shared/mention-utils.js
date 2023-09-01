// @flow

import { oldValidUsernameRegexString } from './account-utils.js';
import SearchIndex from './search-index.js';
import { threadOtherMembers, chatNameMaxLength } from './thread-utils.js';
import { stringForUserExplicit } from './user-utils.js';
import { threadTypes } from '../types/thread-types-enum.js';
import {
  type ThreadInfo,
  type RelativeMemberInfo,
} from '../types/thread-types.js';
import { idSchemaRegex } from '../utils/validation-utils.js';

export type TypeaheadMatchedStrings = {
  +textBeforeAtSymbol: string,
  +usernamePrefix: string,
};

export type Selection = {
  +start: number,
  +end: number,
};

// The simple-markdown package already breaks words out for us, and we are
// supposed to only match when the first word of the input matches
const markdownMentionRegex: RegExp = new RegExp(
  `^(@(${oldValidUsernameRegexString}))\\b`,
);

function isMentioned(username: string, text: string): boolean {
  return new RegExp(`\\B@${username}\\b`, 'i').test(text);
}

const mentionsExtractionRegex = new RegExp(
  `\\B(@(${oldValidUsernameRegexString}))\\b`,
  'g',
);

const chatMentionRegexString = `^(?<!\\\\)(@\\[\\[(${idSchemaRegex}):(.{1,${chatNameMaxLength}}?)(?<!\\\\)\\]\\])`;
const chatMentionRegex: RegExp = new RegExp(chatMentionRegexString);

function decodeChatMentionText(text: string): string {
  return text.replace(/\\]/g, ']');
}

function extractMentionsFromText(text: string): string[] {
  const iterator = text.matchAll(mentionsExtractionRegex);
  return [...iterator].map(matches => matches[2]);
}

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

function getMentionsCandidates(
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
): $ReadOnlyArray<RelativeMemberInfo> {
  if (threadInfo.type !== threadTypes.SIDEBAR) {
    return threadInfo.members;
  }
  if (parentThreadInfo) {
    return parentThreadInfo.members;
  }
  // This scenario should not occur unless the user logs out while looking at a
  // sidebar. In that scenario, the Redux store may be cleared before ReactNav
  // finishes transitioning away from the previous screen
  return [];
}

export {
  markdownMentionRegex,
  isMentioned,
  extractMentionsFromText,
  getTypeaheadUserSuggestions,
  getNewTextAndSelection,
  getTypeaheadRegexMatches,
  getMentionsCandidates,
  chatMentionRegex,
  decodeChatMentionText,
};
