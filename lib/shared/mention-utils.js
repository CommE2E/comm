// @flow

import type { RelativeMemberInfo } from '../types/thread-types';
import { oldValidUsernameRegexString } from './account-utils';
import SearchIndex from './search-index';
import { stringForUserExplicit } from './user-utils';

const mentionRegex: RegExp = new RegExp(
  `(?<textPrefix>(?:^(?:.|\n)*\\s+)|^)@(?<username>${oldValidUsernameRegexString})?$`,
);

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
  textarea: ?HTMLTextAreaElement,
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

  return {
    caretTopOffset: offsetTop - textarea.scrollTop,
    caretLeftOffset: offsetLeft,
  };
}

export { mentionRegex, getTypeaheadUserSuggestions, getCaretOffsets };
