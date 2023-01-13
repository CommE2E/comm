// @flow

import * as React from 'react';
import { Text } from 'react-native';
import { PanGestureHandler, FlatList } from 'react-native-gesture-handler';
import Platform from 'react-native/Libraries/Utilities/Platform.ios';

import type { TypeaheadMatchedStrings } from 'lib/shared/typeahead-utils';
import { stringForUserExplicit } from 'lib/shared/user-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import { useStyles } from '../themes/colors';
import type { Selection } from './chat-input-bar.react';

export type TypeaheadTooltipProps = {
  +text: string,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
  +focusAndUpdateTextAndSelection: (text: string, selection: Selection) => void,
};

function TypeaheadTooltip(props: TypeaheadTooltipProps): React.Node {
  const {
    text,
    matchedStrings,
    suggestedUsers,
    focusAndUpdateTextAndSelection,
  } = props;

  const { textBeforeAtSymbol, usernamePrefix } = matchedStrings;

  const styles = useStyles(unboundStyles);

  const renderTypeaheadButton = React.useCallback(
    ({ item }: { item: RelativeMemberInfo, ... }) => {
      const onPress = () => {
        const newPrefixText = textBeforeAtSymbol;

        const totalMatchLength =
          textBeforeAtSymbol.length + usernamePrefix.length + 1; // 1 for @ char

        let newSuffixText = text.slice(totalMatchLength);
        newSuffixText = (newSuffixText[0] !== ' ' ? ' ' : '') + newSuffixText;

        const newText =
          newPrefixText + '@' + stringForUserExplicit(item) + newSuffixText;

        const newSelectionStart = newText.length - newSuffixText.length + 1;

        focusAndUpdateTextAndSelection(newText, {
          start: newSelectionStart,
          end: newSelectionStart,
        });
      };

      return (
        <Button onPress={onPress} style={styles.button} iosActiveOpacity={0.85}>
          <Text style={styles.buttonLabel} numberOfLines={1}>
            @{item.username}
          </Text>
        </Button>
      );
    },
    [
      focusAndUpdateTextAndSelection,
      styles.button,
      styles.buttonLabel,
      text,
      textBeforeAtSymbol,
      usernamePrefix.length,
    ],
  );

  // This is a hack that was introduced due to a buggy behavior of the
  // absolutely positioned FlatList on Android.
  // There was a bug that was present when there were too few items in a
  // FlatList and it wasn't scrollable. It was only present on Android as
  // iOS has default "bounce" animation, even if the list is too short.
  // The bug manifested itself when we tried to scroll then FlatList.
  // Because it was unscrollable we were really scrolling FlatList
  // below it (in ChatList) as FlatList here has "postion: absolute"
  // and is position over the other FlatList
  // The hack here solves it using a PanGestureHandler. This way Pan events
  // on TypeaheadTooltip FlatList are always caught by handler.
  // When the FlatList is scrollable it scrolls normally, because handler
  // passes those events down to it.
  // If it's not scrollable PanGestureHandler "swallows" them.
  // Normally it would trigger onGestureEvent callback, but we don't need to
  // handle those events. We just want them to be ignored
  // and that's what's actually happening.
  return (
    <PanGestureHandler>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={suggestedUsers}
        renderItem={renderTypeaheadButton}
        keyboardShouldPersistTaps="always"
      />
    </PanGestureHandler>
  );
}

const unboundStyles = {
  container: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    maxHeight: 200,
    width: Platform.OS === 'android' ? '120%' : '102%',
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
    flexDirection: 'row',
    innerHeight: 24,
    padding: 8,
    color: 'typeaheadTooltipText',
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
  },
};

export default TypeaheadTooltip;
