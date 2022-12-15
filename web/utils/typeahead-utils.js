// @flow

import classNames from 'classnames';
import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils';
import { stringForUserExplicit } from 'lib/shared/user-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import { typeaheadStyle } from '../chat/chat-constants';
import css from '../chat/typeahead-tooltip.css';
import Button from '../components/button.react';
import type { TypeaheadState } from '../input/input-state';

const webTypeaheadRegex: RegExp = new RegExp(
  `(?<textPrefix>(?:^(?:.|\n)*\\s+)|^)@(?<username>${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipAction = {
  +key: string,
  +onClick: () => mixed,
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
export type getTypeaheadTooltipActionsParams = {
  inputStateDraft: string,
  inputStateSetDraft: (draft: string) => void,
  inputStateSetTextCursorPosition: (newPosition: number) => void,
  suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
  textBeforeAtSymbol: string,
  typedUsernamePrefix: string,
};

function getTypeaheadTooltipActions(
  params: getTypeaheadTooltipActionsParams,
): $ReadOnlyArray<TypeaheadTooltipAction> {
  const {
    inputStateDraft,
    inputStateSetDraft,
    inputStateSetTextCursorPosition,
    suggestedUsers,
    textBeforeAtSymbol,
    typedUsernamePrefix,
  } = params;
  return suggestedUsers
    .filter(
      suggestedUser => stringForUserExplicit(suggestedUser) !== 'anonymous',
    )
    .map(suggestedUser => ({
      key: suggestedUser.id,
      onClick: () => {
        const newPrefixText = textBeforeAtSymbol;

        const totalMatchLength =
          textBeforeAtSymbol.length + typedUsernamePrefix.length + 1; // 1 for @ char

        let newSuffixText = inputStateDraft.slice(totalMatchLength);
        newSuffixText = (newSuffixText[0] !== ' ' ? ' ' : '') + newSuffixText;

        const newText =
          newPrefixText +
          '@' +
          stringForUserExplicit(suggestedUser) +
          newSuffixText;

        inputStateSetDraft(newText);
        inputStateSetTextCursorPosition(
          newText.length - newSuffixText.length + 1,
        );
      },
      actionButtonContent: stringForUserExplicit(suggestedUser),
    }));
}

function getTypeaheadTooltipButtons(
  inputStateSetTypeaheadState: ($Shape<TypeaheadState>) => void,
  actions: $ReadOnlyArray<TypeaheadTooltipAction>,
  chosenActionPosition: number,
): $ReadOnlyArray<React.Node> {
  return actions.map(({ key, onClick, actionButtonContent }, idx) => {
    const buttonClasses = classNames(css.suggestion, {
      [css.suggestionHover]: idx === chosenActionPosition,
    });

    const onMouseMove: (
      event: SyntheticEvent<HTMLButtonElement>,
    ) => mixed = () => {
      inputStateSetTypeaheadState({
        chosenButtonNumber: idx,
      });
    };

    return (
      <Button
        key={key}
        onClick={onClick}
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
  let newScrollTop = currentScrollTop;

  const upperButtonBoundary = chosenActionPosition * typeaheadStyle.rowHeight;
  const lowerButtonBoundary =
    (chosenActionPosition + 1) * typeaheadStyle.rowHeight;

  if (upperButtonBoundary < currentScrollTop) {
    newScrollTop = upperButtonBoundary;
  } else if (
    lowerButtonBoundary - typeaheadStyle.tooltipMaxHeight >
    currentScrollTop
  ) {
    newScrollTop =
      lowerButtonBoundary +
      typeaheadStyle.tooltipVerticalPadding -
      typeaheadStyle.tooltipMaxHeight;
  }

  return newScrollTop;
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

function getTypeaheadChosenActionPosition(
  chosenButtonNumber: number,
  actionsLength: number,
): number {
  // Getting positive modulo of chosenButtonNumber
  return (
    (chosenButtonNumber +
      Math.abs(Math.floor(chosenButtonNumber / actionsLength)) *
        actionsLength) %
    actionsLength
  );
}

export {
  webTypeaheadRegex,
  getCaretOffsets,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipButtons,
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipPosition,
  getTypeaheadChosenActionPosition,
};
