// @flow

import * as React from 'react';

import SearchIndex from 'lib/shared/search-index';
import {
  type Selection,
  getTypeaheadRegexMatches,
  getTypeaheadUserSuggestions,
} from 'lib/shared/typeahead-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import { nativeTypeaheadRegex } from '../utils/typeahead-utils';
import TypeaheadTooltip from './typeahead-tooltip.react';

export type TypeaheadTooltipWrapperProps = {
  +text: string,
  +selection: Selection,
  +userSearchIndex: SearchIndex,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  +viewerID: ?string,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
};

// Refs are needed for hacks used to display typeahead properly.
// We had a problem with the typeahead flickering when
// the typeahead was already visible and user was typing
// another character (e.g. @a was typed and the user adds another letter)

// There are two events coming from TextInput: text change
// and selection change events.
// A rerender was triggered after both of them.
// That caused a situation in which text and selection state were
// out of sync, e.g. text state was already updated, but selection was not.
// That caused flickering of typeahead, because regex wasn't matched
// after the first event.

// Another gimmick is those events come in different order
// based on platform. Selection change event happens first on iOS
// and text change event happens first on Android. That is the reason
// we need separate refs for two platforms.

// Workaround:
// Depending on the platform, we save either previous text or selection
// state before updating it in the event handler.
// Then we use it to keep text and selection in sync, as it is required
// to correctly match or mismatch the regular expression and
// decide whether we should display the overlay or not.

function TypeaheadTooltipWrapper(
  props: TypeaheadTooltipWrapperProps,
): React.Node {
  const {
    text,
    selection,
    userSearchIndex,
    threadMembers,
    viewerID,
    focusAndUpdateTextAndSelection,
  } = props;

  const androidPreviousText = React.useRef<?string>(null);
  const previousText = usePrevious(text);
  const previousSelection = usePrevious(selection);

  if (text !== previousText) {
    androidPreviousText.current = previousText;
  }

  if (selection !== previousSelection) {
    androidPreviousText.current = null;
  }

  console.log('rerender', text, selection, androidPreviousText.current);

  let typeaheadRegexMatches = null;

  if (androidPreviousText.current) {
    typeaheadRegexMatches = getTypeaheadRegexMatches(
      androidPreviousText.current,
      selection,
      nativeTypeaheadRegex,
    );
  } else {
    typeaheadRegexMatches = getTypeaheadRegexMatches(
      text,
      selection,
      nativeTypeaheadRegex,
    );
  }

  let typeaheadMatchedStrings = null;
  let suggestedUsers = null;

  if (typeaheadRegexMatches) {
    typeaheadMatchedStrings = {
      textBeforeAtSymbol: typeaheadRegexMatches[1] ?? '',
      usernamePrefix: typeaheadRegexMatches[4] ?? '',
    };

    suggestedUsers = getTypeaheadUserSuggestions(
      userSearchIndex,
      threadMembers,
      viewerID,
      typeaheadMatchedStrings.usernamePrefix,
    );
  }

  if (
    !typeaheadMatchedStrings ||
    !suggestedUsers ||
    suggestedUsers.length === 0
  ) {
    console.log('no typeahead!!!');
    return null;
  }

  return (
    <TypeaheadTooltip
      text={text}
      matchedStrings={typeaheadMatchedStrings}
      suggestedUsers={suggestedUsers}
      focusAndUpdateTextAndSelection={focusAndUpdateTextAndSelection}
    />
  );
}

function usePrevious<T>(value: T): T {
  const ref = React.useRef<T>(value);
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default TypeaheadTooltipWrapper;
