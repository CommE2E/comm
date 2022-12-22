// @flow

import * as React from 'react';

import { oldValidUsernameRegexString } from 'lib/shared/account-utils';
import { stringForUserExplicit } from 'lib/shared/user-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import { typeaheadStyle } from '../chat/chat-constants';
import { type InputState } from '../input/input-state';

const typeaheadRegex: RegExp = new RegExp(
  `(?<textPrefix>(?:^(?:.|\n)*\\s+)|^)@(?<username>${oldValidUsernameRegexString})?$`,
);

export type TypeaheadTooltipAction = {
  +key: string,
  +onClick: (SyntheticEvent<HTMLButtonElement>) => mixed,
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

function getTypeaheadTooltipActions(
  inputState: InputState,
  textarea: HTMLTextAreaElement,
  suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
  matchedTextBefore: string,
  matchedText: string,
): $ReadOnlyArray<TypeaheadTooltipAction> {
  return suggestedUsers
    .filter(
      suggestedUser => stringForUserExplicit(suggestedUser) !== 'anonymous',
    )
    .map(suggestedUser => ({
      key: suggestedUser.id,
      onClick: () => {
        const newPrefixText = matchedTextBefore;

        let newSuffixText = inputState.draft.slice(matchedText.length);
        newSuffixText = (newSuffixText[0] !== ' ' ? ' ' : '') + newSuffixText;

        const newText =
          newPrefixText +
          '@' +
          stringForUserExplicit(suggestedUser) +
          newSuffixText;

        inputState.setDraft(newText);
        inputState.setTextCursorPosition(
          newText.length - newSuffixText.length + 1,
        );
      },
      actionButtonContent: stringForUserExplicit(suggestedUser),
    }));
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

export {
  typeaheadRegex,
  getCaretOffsets,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipPosition,
};
