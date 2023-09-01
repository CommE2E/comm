// @flow

import classNames from 'classnames';
import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import {
  getNewTextAndSelection,
  type MentionTypeaheadSuggestionItem,
  type TypeaheadTooltipActionItem,
  encodeChatMentionText,
} from 'lib/shared/mention-utils.js';
import { validChatNameRegexString } from 'lib/shared/thread-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { SetState } from 'lib/types/hook-types.js';

import ThreadAvatar from '../avatars/thread-avatar.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { typeaheadStyle } from '../chat/chat-constants.js';
import css from '../chat/typeahead-tooltip.css';
import Button from '../components/button.react.js';

const webMentionTypeaheadRegex: RegExp = new RegExp(
  `(?<textPrefix>(?:^(?:.|\n)*\\s+)|^)@(?<mentionText>${oldValidUsernameRegexString}|${validChatNameRegexString})?$`,
);

export type TooltipPosition = {
  +top: number,
  +left: number,
};

function getCaretOffsets(
  textarea: HTMLTextAreaElement,
  text: string,
): { caretTopOffset: number, caretLeftOffset: number } {
  if (!textarea) {
    return { caretTopOffset: 0, caretLeftOffset: 0 };
  }

  // terribly hacky but it works I guess :D
  // we had to use it, as it's hard to count lines in textarea
  // and track cursor position within it as
  // lines can be wrapped into new lines without \n character
  // as result of overflow
  const textareaStyle: CSSStyleDeclaration = window.getComputedStyle(
    textarea,
    null,
  );
  const div = document.createElement('div');

  for (const styleName of textareaStyle) {
    div.style.setProperty(styleName, textareaStyle.getPropertyValue(styleName));
  }

  div.style.display = 'inline-block';
  div.style.position = 'absolute';
  div.textContent = text;

  const span = document.createElement('span');
  span.textContent = textarea.value.slice(text.length);
  div.appendChild(span);

  document.body?.appendChild(div);
  const { offsetTop, offsetLeft } = span;
  document.body?.removeChild(div);

  const textareaWidth = parseInt(textareaStyle.getPropertyValue('width'));

  const caretLeftOffset =
    offsetLeft + typeaheadStyle.tooltipWidth > textareaWidth
      ? textareaWidth - typeaheadStyle.tooltipWidth
      : offsetLeft;

  return {
    caretTopOffset: offsetTop - textarea.scrollTop,
    caretLeftOffset,
  };
}
export type GetTypeaheadTooltipActionsParams<SuggestionItemType> = {
  +inputStateDraft: string,
  +inputStateSetDraft: (draft: string) => mixed,
  +inputStateSetTextCursorPosition: (newPosition: number) => mixed,
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +textBeforeAtSymbol: string,
  +query: string,
};

function getMentionTypeaheadTooltipActions(
  params: GetTypeaheadTooltipActionsParams<MentionTypeaheadSuggestionItem>,
): $ReadOnlyArray<TypeaheadTooltipActionItem<MentionTypeaheadSuggestionItem>> {
  const {
    inputStateDraft,
    inputStateSetDraft,
    inputStateSetTextCursorPosition,
    suggestions,
    textBeforeAtSymbol,
    query,
  } = params;
  const actions = [];
  for (const suggestion of suggestions) {
    if (suggestion.type === 'user') {
      const suggestedUser = suggestion.userInfo;
      if (stringForUserExplicit(suggestedUser) === 'anonymous') {
        continue;
      }
      const mentionText = `@${stringForUserExplicit(suggestedUser)}`;
      actions.push({
        key: suggestedUser.id,
        execute: () => {
          const { newText, newSelectionStart } = getNewTextAndSelection(
            textBeforeAtSymbol,
            inputStateDraft,
            query,
            mentionText,
          );

          inputStateSetDraft(newText);
          inputStateSetTextCursorPosition(newSelectionStart);
        },
        actionButtonContent: {
          type: 'user',
          userInfo: suggestedUser,
        },
      });
    } else if (suggestion.type === 'chat') {
      const suggestedChat = suggestion.threadInfo;
      const mentionText = `@[[${suggestedChat.id}:${encodeChatMentionText(
        suggestedChat.uiName,
      )}]]`;
      actions.push({
        key: suggestedChat.id,
        execute: () => {
          const { newText, newSelectionStart } = getNewTextAndSelection(
            textBeforeAtSymbol,
            inputStateDraft,
            query,
            mentionText,
          );

          inputStateSetDraft(newText);
          inputStateSetTextCursorPosition(newSelectionStart);
        },
        actionButtonContent: {
          type: 'chat',
          threadInfo: suggestedChat,
        },
      });
    }
  }
  return actions;
}

export type GetMentionTypeaheadTooltipButtonsParams<SuggestionItemType> = {
  +setChosenPositionInOverlay: SetState<number>,
  +chosenPositionInOverlay: number,
  +actions: $ReadOnlyArray<TypeaheadTooltipActionItem<SuggestionItemType>>,
};
function getMentionTypeaheadTooltipButtons(
  params: GetMentionTypeaheadTooltipButtonsParams<MentionTypeaheadSuggestionItem>,
): $ReadOnlyArray<React.Node> {
  const { setChosenPositionInOverlay, chosenPositionInOverlay, actions } =
    params;
  return actions.map((action, idx) => {
    const { key, execute, actionButtonContent } = action;
    const buttonClasses = classNames(css.suggestion, {
      [css.suggestionHover]: idx === chosenPositionInOverlay,
    });

    const onMouseMove: (
      event: SyntheticEvent<HTMLButtonElement>,
    ) => mixed = () => {
      setChosenPositionInOverlay(idx);
    };

    let avatarComponent = null;
    let typeaheadButtonText = null;
    if (actionButtonContent.type === 'user') {
      const suggestedUser = actionButtonContent.userInfo;
      avatarComponent = (
        <UserAvatar size="small" userID={actionButtonContent.userInfo.id} />
      );
      typeaheadButtonText = `@${stringForUserExplicit(suggestedUser)}`;
    } else if (actionButtonContent.type === 'chat') {
      const suggestedChat = actionButtonContent.threadInfo;
      avatarComponent = (
        <ThreadAvatar
          size="small"
          threadInfo={actionButtonContent.threadInfo}
        />
      );
      typeaheadButtonText = `@${suggestedChat.uiName}`;
    }

    return (
      <Button
        key={key}
        onClick={execute}
        onMouseMove={onMouseMove}
        className={buttonClasses}
      >
        {avatarComponent}
        <span className={css.username}>{typeaheadButtonText}</span>
      </Button>
    );
  });
}

function getTypeaheadOverlayScroll(
  currentScrollTop: number,
  chosenActionPosition: number,
): number {
  const upperButtonBoundary = chosenActionPosition * typeaheadStyle.rowHeight;
  const lowerButtonBoundary =
    (chosenActionPosition + 1) * typeaheadStyle.rowHeight;

  if (upperButtonBoundary < currentScrollTop) {
    return upperButtonBoundary;
  } else if (
    lowerButtonBoundary - typeaheadStyle.tooltipMaxHeight >
    currentScrollTop
  ) {
    return (
      lowerButtonBoundary +
      typeaheadStyle.tooltipVerticalPadding -
      typeaheadStyle.tooltipMaxHeight
    );
  }

  return currentScrollTop;
}

function getTypeaheadTooltipPosition(
  textarea: HTMLTextAreaElement,
  actionsLength: number,
  textBeforeAtSymbol: string,
): TooltipPosition {
  const { caretTopOffset, caretLeftOffset } = getCaretOffsets(
    textarea,
    textBeforeAtSymbol,
  );

  const textareaBoundingClientRect = textarea.getBoundingClientRect();

  const top: number =
    textareaBoundingClientRect.top -
    Math.min(
      typeaheadStyle.tooltipVerticalPadding +
        actionsLength * typeaheadStyle.rowHeight,
      typeaheadStyle.tooltipMaxHeight,
    ) -
    typeaheadStyle.tooltipTopOffset +
    caretTopOffset;

  const left: number =
    textareaBoundingClientRect.left -
    typeaheadStyle.tooltipLeftOffset +
    caretLeftOffset;

  return { top, left };
}

export {
  webMentionTypeaheadRegex,
  getCaretOffsets,
  getMentionTypeaheadTooltipActions,
  getMentionTypeaheadTooltipButtons,
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipPosition,
};
