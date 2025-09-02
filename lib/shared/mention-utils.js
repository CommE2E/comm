// @flow

import * as React from 'react';

import { markdownUserMentionRegexString } from './account-utils.js';
import SentencePrefixSearchIndex from './sentence-prefix-search-index.js';
import { threadTypeIsSidebar } from './threads/thread-specs.js';
import { stringForUserExplicit } from './user-utils.js';
import { useResolvableNames } from '../hooks/ens-cache.js';
import { useUserSearchIndex } from '../selectors/nav-selectors.js';
import type {
  RelativeMemberInfo,
  ResolvedThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { ChatMentionCandidates } from '../types/thread-types.js';
import { chatNameMaxLength, idSchemaRegex } from '../utils/validation-utils.js';

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
  `^(@(${markdownUserMentionRegexString}))\\b`,
);

function isUserMentioned(username: string, text: string): boolean {
  return new RegExp(`\\B@${username}\\b`, 'i').test(text);
}

const userMentionsExtractionRegex = new RegExp(
  `\\B(@(${markdownUserMentionRegexString}))\\b`,
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

const useResolvableNamesOptions = { allAtOnce: true };
function useMentionTypeaheadUserSuggestions(
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  typeaheadMatchedStrings: ?TypeaheadMatchedStrings,
): $ReadOnlyArray<MentionTypeaheadUserSuggestionItem> {
  const userSearchIndex = useUserSearchIndex(threadMembers);
  const resolvedThreadMembers = useResolvableNames(
    threadMembers,
    useResolvableNamesOptions,
  );
  const usernamePrefix: ?string = typeaheadMatchedStrings?.query;

  return React.useMemo(() => {
    // If typeaheadMatchedStrings is undefined, we want to return no results
    if (usernamePrefix === undefined || usernamePrefix === null) {
      return [];
    }

    const userIDs = userSearchIndex.getSearchResults(usernamePrefix);
    const usersInThread = resolvedThreadMembers.filter(member => member.role);

    return usersInThread
      .filter(user => usernamePrefix.length === 0 || userIDs.includes(user.id))
      .sort((userA, userB) =>
        stringForUserExplicit(userA).localeCompare(
          stringForUserExplicit(userB),
        ),
      )
      .map(userInfo => ({ type: 'user', userInfo }));
  }, [userSearchIndex, resolvedThreadMembers, usernamePrefix]);
}

function useMentionTypeaheadChatSuggestions(
  chatSearchIndex: ?SentencePrefixSearchIndex,
  chatMentionCandidates: ChatMentionCandidates,
  typeaheadMatchedStrings: ?TypeaheadMatchedStrings,
): $ReadOnlyArray<MentionTypeaheadChatSuggestionItem> {
  const chatNamePrefix: ?string = typeaheadMatchedStrings?.query;

  return React.useMemo(() => {
    const result = [];

    if (
      chatNamePrefix === undefined ||
      chatNamePrefix === null ||
      !chatSearchIndex
    ) {
      return result;
    }

    const threadIDs = chatSearchIndex.getSearchResults(chatNamePrefix);
    for (const threadID of threadIDs) {
      if (!chatMentionCandidates[threadID]) {
        continue;
      }
      result.push({
        type: 'chat',
        threadInfo: chatMentionCandidates[threadID].threadInfo,
      });
    }
    return result;
  }, [chatSearchIndex, chatMentionCandidates, chatNamePrefix]);
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

function useUserMentionsCandidates(
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
): $ReadOnlyArray<RelativeMemberInfo> {
  return React.useMemo(() => {
    if (!threadTypeIsSidebar(threadInfo.type)) {
      return threadInfo.members;
    }
    if (parentThreadInfo) {
      return parentThreadInfo.members;
    }
    // This scenario should not occur unless the user logs out while looking at
    // a sidebar. In that scenario, the Redux store may be cleared before
    // ReactNav finishes transitioning away from the previous screen
    return [];
  }, [threadInfo, parentThreadInfo]);
}

export {
  markdownUserMentionRegex,
  isUserMentioned,
  extractUserMentionsFromText,
  useMentionTypeaheadUserSuggestions,
  useMentionTypeaheadChatSuggestions,
  getNewTextAndSelection,
  getTypeaheadRegexMatches,
  useUserMentionsCandidates,
  chatMentionRegex,
  encodeChatMentionText,
  decodeChatMentionText,
  getRawChatMention,
  renderChatMentionsWithAltText,
};
