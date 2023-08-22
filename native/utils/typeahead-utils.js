// @flow

import * as React from 'react';
import { Text } from 'react-native';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import {
  getNewTextAndSelection,
  type Selection,
  type TypeaheadTooltipActionItem,
  type MentionTypeaheadSuggestionItem,
} from 'lib/shared/mention-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';

import UserAvatar from '../avatars/user-avatar.react.js';
import type { TypeaheadTooltipStyles } from '../chat/typeahead-tooltip.react.js';

// Native regex is a little bit different than web one as
// there are no named capturing groups yet on native.
const nativeMentionTypeaheadRegex: RegExp = new RegExp(
  `((^(.|\n)*\\s+)|^)@(${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipActionsParams<SuggestionType> = {
  +suggestions: $ReadOnlyArray<SuggestionType>,
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
    }
  }
  return actions;
}

export type TypeaheadTooltipButtonRendererParams<SuggestionItemType> = {
  +item: TypeaheadTooltipActionItem<SuggestionItemType>,
  +styles: TypeaheadTooltipStyles,
};
function mentionTypeaheadTooltipButtonRenderer({
  item,
  styles,
}: TypeaheadTooltipButtonRendererParams<MentionTypeaheadSuggestionItem>): React.Node {
  let avatarComponent = null;
  let typeaheadTooltipButtonText = null;
  if (item.actionButtonContent.type === 'user') {
    avatarComponent = (
      <UserAvatar size="small" userID={item.actionButtonContent.userInfo.id} />
    );
    typeaheadTooltipButtonText = item.actionButtonContent.userInfo.username;
  }
  return (
    <>
      {avatarComponent}
      <Text style={styles.buttonLabel} numberOfLines={1}>
        {typeaheadTooltipButtonText}
      </Text>
    </>
  );
}

export {
  nativeMentionTypeaheadRegex,
  mentionTypeaheadTooltipActions,
  mentionTypeaheadTooltipButtonRenderer,
};
