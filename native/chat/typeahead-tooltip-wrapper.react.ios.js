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

export type TypeaheadTooltipProps = {
  +text: string,
  +selection: Selection,
  +userSearchIndex: SearchIndex,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  +viewerID: ?string,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
};

function TypeaheadTooltipWrapper(props: TypeaheadTooltipProps): React.Node {
  const {
    text,
    selection,
    userSearchIndex,
    threadMembers,
    viewerID,
    focusAndUpdateTextAndSelection,
  } = props;

  const iosPreviousSelection = React.useRef<?Selection>(null);
  const previousText = usePrevious(text);
  const previousSelection = usePrevious(selection);

  if (text !== previousText) {
    console.log('text');
    iosPreviousSelection.current = null;
  }

  if (selection !== previousSelection) {
    console.log('selection');
    iosPreviousSelection.current = previousSelection;
  }

  console.log('rerender', text, selection, iosPreviousSelection.current);

  let typeaheadRegexMatches = null;

  if (iosPreviousSelection.current) {
    typeaheadRegexMatches = getTypeaheadRegexMatches(
      text,
      iosPreviousSelection.current,
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

  const result = React.useMemo(() => {
    if (
      !typeaheadMatchedStrings ||
      !suggestedUsers ||
      suggestedUsers.length === 0
    ) {
      console.log('no typeahead!!!');
      return null;
    } else {
      return (
        <TypeaheadTooltip
          text={text}
          matchedStrings={typeaheadMatchedStrings}
          suggestedUsers={suggestedUsers}
          focusAndUpdateTextAndSelection={focusAndUpdateTextAndSelection}
        />
      );
    }
  }, [
    focusAndUpdateTextAndSelection,
    suggestedUsers,
    text,
    typeaheadMatchedStrings,
  ]);

  return result;
}

function usePrevious<T>(value: T): T {
  const ref = React.useRef<T>(value);
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default TypeaheadTooltipWrapper;
