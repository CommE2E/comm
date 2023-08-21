// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { PanGestureHandler, FlatList } from 'react-native-gesture-handler';

import {
  type TypeaheadMatchedStrings,
  type Selection,
  getNewTextAndSelection,
} from 'lib/shared/mention-utils.js';

import Button from '../components/button.react.js';
import { useStyles } from '../themes/colors.js';

export type TypeaheadTooltipProps<EntryType> = {
  +text: string,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestions: $ReadOnlyArray<EntryType>,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
  +typeaheadButtonRenderer: ({
    +item: EntryType,
    +suggestionText: string,
    +styles: typeof unboundStyles,
  }) => React.Node,
  +suggestionTextExtractor: (entry: EntryType) => string,
};

function TypeaheadTooltip<EntryType>(
  props: TypeaheadTooltipProps<EntryType>,
): React.Node {
  const {
    text,
    matchedStrings,
    suggestions,
    focusAndUpdateTextAndSelection,
    typeaheadButtonRenderer,
    suggestionTextExtractor,
  } = props;

  const { textBeforeAtSymbol, textPrefix } = matchedStrings;

  const styles = useStyles(unboundStyles);

  const renderTypeaheadButton = React.useCallback(
    ({ item }: { item: EntryType, ... }) => {
      const suggestionText = suggestionTextExtractor(item);
      const onPress = () => {
        const { newText, newSelectionStart } = getNewTextAndSelection(
          textBeforeAtSymbol,
          text,
          textPrefix,
          suggestionText,
        );

        focusAndUpdateTextAndSelection(newText, {
          start: newSelectionStart,
          end: newSelectionStart,
        });
      };

      return (
        <Button onPress={onPress} style={styles.button} iosActiveOpacity={0.85}>
          {typeaheadButtonRenderer({
            item,
            suggestionText,
            styles,
          })}
        </Button>
      );
    },
    [
      suggestionTextExtractor,
      styles,
      typeaheadButtonRenderer,
      textBeforeAtSymbol,
      text,
      textPrefix,
      focusAndUpdateTextAndSelection,
    ],
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
        data={suggestions}
        renderItem={renderTypeaheadButton}
        keyboardShouldPersistTaps="always"
      />
    ),
    [
      renderTypeaheadButton,
      styles.container,
      styles.contentContainer,
      suggestions,
    ],
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
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    innerHeight: 24,
    padding: 8,
    color: 'typeaheadTooltipText',
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 8,
  },
};

export default TypeaheadTooltip;
