// @flow

import _min from 'lodash/fp/min';
import * as React from 'react';
import { Text } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
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

  const renderTypeaheadButton = ({
    item,
  }: {
    item: RelativeMemberInfo,
    ...
  }) => {
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
  };

  const flatListStyle = [
    styles.container,
    { maxHeight: 200 },
    { maxHeight: _min([200, suggestedUsers.length * 38]) },
  ];

  return (
    <FlatList
      style={flatListStyle}
      contentContainerStyle={styles.contentContainer}
      data={suggestedUsers}
      renderItem={renderTypeaheadButton}
      keyboardShouldPersistTaps="always"
      onScroll={() => {
        console.log('scroll inner');
      }}
      overScrollMode="always"
    />
  );
}

const unboundStyles = {
  container: {
    position: 'absolute',
    left: 0,
    bottom: 42,
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
