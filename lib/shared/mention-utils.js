// @flow

import { oldValidUsernameRegexString } from './account-utils.js';
import SentencePrefixSearchIndex from './sentence-prefix-search-index.js';
import { threadOtherMembers } from './thread-utils.js';
import { stringForUserExplicit } from './user-utils.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type {
  ThreadInfo,
  RelativeMemberInfo,
  ResolvedThreadInfo,
  ChatMentionCandidates,
} from '../types/thread-types.js';
import { idSchemaRegex, chatNameMaxLength } from '../utils/validation-utils.js';

export type TypeaheadMatchedStrings = {
  +textBeforeAtSymbol: string,
  +query: string,
};

export type Selection = {
  +start: number,
  +end: number,
};

type MentionTypeaheadUserSuggestionItem = {
  +type: 'user',
  +userInfo: RelativeMemberInfo,
};

type MentionTypeaheadChatSuggestionItem = {
  +type: 'chat',
  +threadInfo: ResolvedThreadInfo,
};

export type MentionTypeaheadSuggestionItem =
  | MentionTypeaheadUserSuggestionItem
  | MentionTypeaheadChatSuggestionItem;

export type TypeaheadTooltipActionItem<SuggestionItemType> = {
  +key: string,
  +execute: () => mixed,
  +actionButtonContent: SuggestionItemType,
};

// The simple-markdown package already breaks words out for us, and we are
// supposed to only match when the first word of the input matches
const markdownUserMentionRegex: RegExp = new RegExp(
  `^(@(${oldValidUsernameRegexString}))\\b`,
);

function isUserMentioned(username: string, text: string): boolean {
  return new RegExp(`\\B@${username}\\b`, 'i').test(text);
}

const userMentionsExtractionRegex = new RegExp(
  `\\B(@(${oldValidUsernameRegexString}))\\b`,
  'g',
);

const chatMentionRegexString = `([^\\\\]|^)(@\\[\\[(${idSchemaRegex}):((.{0,${chatNameMaxLength}}?)(?!\\\\).|^)\\]\\])`;
const chatMentionRegex: RegExp = new RegExp(`^${chatMentionRegexString}`);
const globalChatMentionRegex: RegExp = new RegExp(chatMentionRegexString, 'g');

function encodeChatMentionText(text: string): string {
  return text.replace(/]/g, '\\]');
}

function decodeChatMentionText(text: string): string {
  return text.replace(/\\]/g, ']');
}

function getRawChatMention(threadInfo: ResolvedThreadInfo): string {
  return `@[[${threadInfo.id}:${encodeChatMentionText(threadInfo.uiName)}]]`;
}

function renderChatMentionsWithAltText(text: string): string {
  return text.replace(
    globalChatMentionRegex,
    (...match) => `${match[1]}@${decodeChatMentionText(match[4])}`,
  );
}

function extractUserMentionsFromText(text: string): string[] {
  const iterator = text.matchAll(userMentionsExtractionRegex);
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

function getMentionTypeaheadUserSuggestions(
  userSearchIndex: SentencePrefixSearchIndex,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  viewerID: ?string,
  usernamePrefix: string,
): $ReadOnlyArray<MentionTypeaheadUserSuggestionItem> {
  const userIDs = userSearchIndex.getSearchResults(usernamePrefix);
  const usersInThread = threadOtherMembers(threadMembers, viewerID);

  return usersInThread
    .filter(user => usernamePrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    )
    .map(userInfo => ({ type: 'user', userInfo }));
}

function getMentionTypeaheadChatSuggestions(
  chatSearchIndex: SentencePrefixSearchIndex,
  chatMentionCandidates: ChatMentionCandidates,
  chatNamePrefix: string,
): $ReadOnlyArray<MentionTypeaheadChatSuggestionItem> {
  const result = [];
  const threadIDs =
    chatNamePrefix.length === 0
      ? chatSearchIndex.entries
      : chatSearchIndex.getSearchResults(chatNamePrefix);
  for (const threadID of threadIDs) {
    if (!chatMentionCandidates[threadID]) {
      continue;
    }
    result.push({
      type: 'chat',
      threadInfo: chatMentionCandidates[threadID],
    });
  }
  return result;
}

function getNewTextAndSelection(
  textBeforeAtSymbol: string,
  entireText: string,
  query: string,
  suggestionText: string,
): {
  newText: string,
  newSelectionStart: number,
} {
  const totalMatchLength = textBeforeAtSymbol.length + query.length + 1; // 1 for @ char

  let newSuffixText = entireText.slice(totalMatchLength);
  newSuffixText = (newSuffixText[0] !== ' ' ? ' ' : '') + newSuffixText;

  const newText = textBeforeAtSymbol + suggestionText + newSuffixText;

  const newSelectionStart = newText.length - newSuffixText.length + 1;

  return { newText, newSelectionStart };
}

function getUserMentionsCandidates(
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
  markdownUserMentionRegex,
  isUserMentioned,
  extractUserMentionsFromText,
  getMentionTypeaheadUserSuggestions,
  getMentionTypeaheadChatSuggestions,
  getNewTextAndSelection,
  getTypeaheadRegexMatches,
  getUserMentionsCandidates,
  chatMentionRegex,
  encodeChatMentionText,
  decodeChatMentionText,
  getRawChatMention,
  renderChatMentionsWithAltText,
};
