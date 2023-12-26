// @flow

import * as React from 'react';

import {
  getNewTextAndSelection,
  getRawChatMention,
  type Selection,
  type TypeaheadTooltipActionItem,
  type MentionTypeaheadSuggestionItem,
} from 'lib/shared/mention-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import { validChatNameRegexString } from 'lib/utils/validation-utils.js';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeMentionTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${validChatNameRegexString})?$`,
);

type FocusAndUpdateTextAndSelection = (
  text: string,
  selection: Selection,
) => void;

export type TypeaheadTooltipActionsParams<SuggestionItemType> = {
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +textBeforeAtSymbol: string,
  +text: string,
  +query: string,
  +focusAndUpdateTextAndSelection: FocusAndUpdateTextAndSelection,
};

type MentionTypeaheadTooltipActionExecuteHandlerParams = {
  +textBeforeAtSymbol: string,
  +text: string,
  +query: string,
  +mentionText: string,
  +focusAndUpdateTextAndSelection: FocusAndUpdateTextAndSelection,
};

function mentionTypeaheadTooltipActionExecuteHandler({
  textBeforeAtSymbol,
  text,
  query,
  mentionText,
  focusAndUpdateTextAndSelection,
}: MentionTypeaheadTooltipActionExecuteHandlerParams) {
  const { newText, newSelectionStart } = getNewTextAndSelection(
    textBeforeAtSymbol,
    text,
    query,
    mentionText,
  );
  focusAndUpdateTextAndSelection(newText, {
    start: newSelectionStart,
    end: newSelectionStart,
  });
}

function mentionTypeaheadTooltipActions({
  suggestions,
  textBeforeAtSymbol,
  text,
  query,
  focusAndUpdateTextAndSelection,
}: TypeaheadTooltipActionsParams<MentionTypeaheadSuggestionItem>): $ReadOnlyArray<
  TypeaheadTooltipActionItem<MentionTypeaheadSuggestionItem>,
> {
  const actions = [];
  for (const suggestion of suggestions) {
    if (suggestion.type === 'user') {
      const { userInfo } = suggestion;
      const resolvedUsername = stringForUserExplicit(userInfo);
      if (resolvedUsername === 'anonymous') {
        continue;
      }
      const mentionText = `@${resolvedUsername}`;
      actions.push({
        key: userInfo.id,
        execute: () =>
          mentionTypeaheadTooltipActionExecuteHandler({
            textBeforeAtSymbol,
            text,
            query,
            mentionText,
            focusAndUpdateTextAndSelection,
          }),
        actionButtonContent: {
          type: 'user',
          userInfo,
        },
      });
    } else if (suggestion.type === 'chat') {
      const { rawChatName, threadInfo } = suggestion;
      const mentionText = getRawChatMention(threadInfo);
      actions.push({
        key: threadInfo.id,
        execute: () =>
          mentionTypeaheadTooltipActionExecuteHandler({
            textBeforeAtSymbol,
            text,
            query,
            mentionText,
            focusAndUpdateTextAndSelection,
          }),
        actionButtonContent: {
          type: 'chat',
          threadInfo,
          rawChatName,
        },
      });
    }
  }
  return actions;
}

export type TypeaheadTooltipButtonComponentType<SuggestionItemType> =
  React.ComponentType<{
    +item: TypeaheadTooltipActionItem<SuggestionItemType>,
  }>;

export { nativeMentionTypeaheadRegex, mentionTypeaheadTooltipActions };
