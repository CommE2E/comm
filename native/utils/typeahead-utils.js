// @flow

import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import {
  getNewTextAndSelection,
  encodeChatMentionText,
  type Selection,
  type TypeaheadTooltipActionItem,
  type MentionTypeaheadSuggestionItem,
} from 'lib/shared/mention-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeMentionTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipActionsParams<SuggestionItemType> = {
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +textBeforeAtSymbol: string,
  +text: string,
  +textPrefix: string,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
};
function mentionTypeaheadTooltipActions({
  suggestions,
  textBeforeAtSymbol,
  text,
  textPrefix,
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
        execute: () => {
          const { newText, newSelectionStart } = getNewTextAndSelection(
            textBeforeAtSymbol,
            text,
            textPrefix,
            mentionText,
          );
          focusAndUpdateTextAndSelection(newText, {
            start: newSelectionStart,
            end: newSelectionStart,
          });
        },
        actionButtonContent: {
          type: 'user',
          userInfo,
        },
      });
    } else if (suggestion.type === 'chat') {
      const { threadInfo } = suggestion;
      const mentionText = `@[[${threadInfo.id}:${encodeChatMentionText(
        threadInfo.uiName,
      )}]]`;
      actions.push({
        key: threadInfo.id,
        execute: () => {
          const { newText, newSelectionStart } = getNewTextAndSelection(
            textBeforeAtSymbol,
            text,
            textPrefix,
            mentionText,
          );
          focusAndUpdateTextAndSelection(newText, {
            start: newSelectionStart,
            end: newSelectionStart,
          });
        },
        actionButtonContent: {
          type: 'chat',
          threadInfo,
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
