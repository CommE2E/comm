// @flow

import classNames from 'classnames';
import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils.js';
import { getNewTextAndSelection } from 'lib/shared/mention-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { RelativeMemberInfo } from 'lib/types/thread-types.js';

import { typeaheadStyle } from '../chat/chat-constants.js';
import css from '../chat/typeahead-tooltip.css';
import Button from '../components/button.react.js';

const webTypeaheadRegex: RegExp = new RegExp(
  `(?<textPrefix>(?:^(?:.|\n)*\\s+)|^)@(?<username>${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipAction = {
  +key: string,
  +execute: () => mixed,
  +actionButtonContent: React.Node,
};

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
export type GetTypeaheadTooltipActionsParams = {
  +inputStateDraft: string,
  +inputStateSetDraft: (draft: string) => mixed,
  +inputStateSetTextCursorPosition: (newPosition: number) => mixed,
  +suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
  +textBeforeAtSymbol: string,
  +usernamePrefix: string,
};

function getTypeaheadTooltipActions(
  params: GetTypeaheadTooltipActionsParams,
): $ReadOnlyArray<TypeaheadTooltipAction> {
  const {
    inputStateDraft,
    inputStateSetDraft,
    inputStateSetTextCursorPosition,
    suggestedUsers,
    textBeforeAtSymbol,
    usernamePrefix,
  } = params;
  return suggestedUsers
    .filter(
      suggestedUser => stringForUserExplicit(suggestedUser) !== 'anonymous',
    )
    .map(suggestedUser => ({
      key: suggestedUser.id,
      execute: () => {
        const { newText, newSelectionStart } = getNewTextAndSelection(
          textBeforeAtSymbol,
          inputStateDraft,
          usernamePrefix,
          suggestedUser,
        );

        inputStateSetDraft(newText);
        inputStateSetTextCursorPosition(newSelectionStart);
      },
      actionButtonContent: stringForUserExplicit(suggestedUser),
    }));
}

function getTypeaheadTooltipButtons(
  setChosenPositionInOverlay: SetState<number>,
  chosenPositionInOverlay: number,
  actions: $ReadOnlyArray<TypeaheadTooltipAction>,
): $ReadOnlyArray<React.Node> {
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

    return (
      <Button
        key={key}
        onClick={execute}
        onMouseMove={onMouseMove}
        className={buttonClasses}
      >
        <span>@{actionButtonContent}</span>
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
  webTypeaheadRegex,
  getCaretOffsets,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipButtons,
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipPosition,
};
