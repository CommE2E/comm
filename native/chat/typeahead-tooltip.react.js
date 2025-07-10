// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { PanGestureHandler, FlatList } from 'react-native-gesture-handler';

import {
  type TypeaheadMatchedStrings,
  type Selection,
  type TypeaheadTooltipActionItem,
} from 'lib/shared/mention-utils.js';

import { useStyles } from '../themes/colors.js';
import type {
  TypeaheadTooltipActionsParams,
  TypeaheadTooltipButtonComponentType,
} from '../utils/typeahead-utils.js';

export type TypeaheadTooltipProps<SuggestionItemType> = {
  +text: string,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
  +typeaheadTooltipActionsGetter: (
    TypeaheadTooltipActionsParams<SuggestionItemType>,
  ) => $ReadOnlyArray<TypeaheadTooltipActionItem<SuggestionItemType>>,
  +TypeaheadTooltipButtonComponent: TypeaheadTooltipButtonComponentType<SuggestionItemType>,
};

function TypeaheadTooltip<SuggestionItemType>(
  props: TypeaheadTooltipProps<SuggestionItemType>,
): React.Node {
  const {
    text,
    matchedStrings,
    suggestions,
    focusAndUpdateTextAndSelection,
    TypeaheadTooltipButtonComponent,
    typeaheadTooltipActionsGetter,
  } = props;

  const { textBeforeAtSymbol, query } = matchedStrings;

  const styles = useStyles(unboundStyles);
  const actions = React.useMemo(
    () =>
      typeaheadTooltipActionsGetter({
        suggestions,
        textBeforeAtSymbol,
        text,
        query,
        focusAndUpdateTextAndSelection,
      }),
    [
      typeaheadTooltipActionsGetter,
      suggestions,
      textBeforeAtSymbol,
      text,
      query,
      focusAndUpdateTextAndSelection,
    ],
  );

  const renderTypeaheadButton = React.useCallback(
    ({
      item,
    }: {
      item: TypeaheadTooltipActionItem<SuggestionItemType>,
      ...
    }) => <TypeaheadTooltipButtonComponent item={item} />,
    [TypeaheadTooltipButtonComponent],
  );

  // This is a hack that was introduced due to a buggy behavior of a
  // absolutely positioned FlatList on Android.

  // There was a bug that was present when there were too few items in a
  // FlatList and it wasn't scrollable. It was only present on Android as
  // iOS has a default "bounce" animation, even if the list is too short.
  // The bug manifested itself when we tried to scroll the FlatList.
  // Because it was unscrollable we were really scrolling FlatList
  // below it (in the ChatList) as FlatList here has "position: absolute"
  // and is positioned over the other FlatList.

  // The hack here solves it by using a PanGestureHandler. This way Pan events
  // on TypeaheadTooltip FlatList are always caught by handler.
  // When the FlatList is scrollable it scrolls normally, because handler
  // passes those events down to it.

  // If it's not scrollable, the PanGestureHandler "swallows" them.
  // Normally it would trigger onGestureEvent callback, but we don't need to
  // handle those events. We just want them to be ignored
  // and that's what's actually happening.

  const flatList = React.useMemo(
    () => (
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={actions}
        renderItem={renderTypeaheadButton}
        keyboardShouldPersistTaps="always"
      />
    ),
    [actions, renderTypeaheadButton, styles.container, styles.contentContainer],
  );

  const listWithConditionalHandler = React.useMemo(() => {
    if (Platform.OS === 'android') {
      return <PanGestureHandler>{flatList}</PanGestureHandler>;
    }
    return flatList;
  }, [flatList]);

  return listWithConditionalHandler;
}

const unboundStyles = {
  container: {
    position: 'absolute',
    maxHeight: 200,
    left: 0,
    right: 0,
    bottom: '100%',
    backgroundColor: 'typeaheadTooltipBackground',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: 'typeaheadTooltipBorder',
    borderStyle: 'solid',
  },
  contentContainer: {
    padding: 8,
  },
};

export default TypeaheadTooltip;
