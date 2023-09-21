// @flow

import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import {
  getNewTextAndSelection,
  type Selection,
  type TypeaheadTooltipActionItem,
  type TypeaheadSuggestionItem,
} from 'lib/shared/mention-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipActionsParams<SuggestionItemType> = {
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +textBeforeAtSymbol: string,
  +text: string,
  +query: string,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
};
function mentionTypeaheadTooltipActions({
  suggestions,
  textBeforeAtSymbol,
  text,
  query,
  focusAndUpdateTextAndSelection,
}: TypeaheadTooltipActionsParams<TypeaheadSuggestionItem>): $ReadOnlyArray<
  TypeaheadTooltipActionItem<TypeaheadSuggestionItem>,
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
            query,
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
    }
  }
  return actions;
}

export type TypeaheadTooltipButtonComponentType<SuggestionItemType> =
  React.ComponentType<{
    +item: TypeaheadTooltipActionItem<SuggestionItemType>,
  }>;

export { nativeTypeaheadRegex, mentionTypeaheadTooltipActions };
