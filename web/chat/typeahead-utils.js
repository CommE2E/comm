// @flow

import classNames from 'classnames';
import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils';
import SearchIndex from 'lib/shared/search-index';
import { stringForUserExplicit } from 'lib/shared/user-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import type { TypeaheadState } from '../input/input-state';
import { typeaheadStyle } from './chat-constants';
import css from './typeahead-tooltip.css';

const typeaheadRegex: RegExp = new RegExp(
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

function getTypeaheadUserSuggestions(
  userSearchIndex: SearchIndex,
  usersInThread: $ReadOnlyArray<RelativeMemberInfo>,
  typedPrefix: string,
): $ReadOnlyArray<RelativeMemberInfo> {
  const userIDs = userSearchIndex.getSearchResults(typedPrefix);

  return usersInThread
    .filter(user => typedPrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    );
}

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

function getTypeaheadTooltipActions(
  inputStateDraft: string,
  inputStateSetDraft: (draft: string) => void,
  inputStateSetTextCursorPosition: (newPosition: number) => void,
  suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
  matchedTextBeforeAtSymbol: string,
  matchedText: string,
): $ReadOnlyArray<TypeaheadTooltipAction> {
  return suggestedUsers
    .filter(
      suggestedUser => stringForUserExplicit(suggestedUser) !== 'anonymous',
    )
    .map(suggestedUser => ({
      key: suggestedUser.id,
      onClick: () => {
        const newPrefixText = matchedTextBeforeAtSymbol;

        let newSuffixText = inputStateDraft.slice(matchedText.length);
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
  matchedTextBefore: string,
): TooltipPosition {
  const { caretTopOffset, caretLeftOffset } = getCaretOffsets(
    textarea,
    matchedTextBefore,
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
  typeaheadRegex,
  getTypeaheadUserSuggestions,
  getCaretOffsets,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipButtons,
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipPosition,
  getTypeaheadChosenActionPosition,
};
