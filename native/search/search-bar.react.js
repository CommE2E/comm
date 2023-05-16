//@flow

import * as React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  onPressSend: (text: string) => void,
  onClear: () => void,
};

function SearchBox(props: Props): React.Node {
  const { onPressSend, onClear } = props;

  const [text, setText] = React.useState('');

  const onEndEditing = React.useCallback(
    () => onPressSend(text),
    [onPressSend, text],
  );

  const onClearSearchFiled = React.useCallback(() => {
    onClear();
    setText('');
  }, [onClear]);

  const styles = useStyles(unboundStyles);

  const clearButton = React.useMemo(() => {
    if (text.length !== 0) {
      return (
        <TouchableOpacity
          onPress={onClearSearchFiled}
          style={styles.cancelButton}
        >
          <SWMansionIcon
            name="cross"
            size={11}
            style={styles.cancelButtonIcon}
          />
        </TouchableOpacity>
      );
    }
    return null;
  }, [
    onClearSearchFiled,
    styles.cancelButton,
    styles.cancelButtonIcon,
    text.length,
  ]);

  return (
    <View style={styles.container}>
      <SWMansionIcon name="search" size={24} style={styles.button} />

      <View style={styles.wrapper}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search"
          style={styles.searchBoxTextStyle}
          placeholderTextColor="#808080"
          onEndEditing={onEndEditing}
          returnKeyType="search"
        />
      </View>
      {clearButton}
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelInputBackground',
    borderRadius: 8,
    paddingHorizontal: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchBoxTextStyle: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    fontWeight: '400',
    placeholderTextColor: 'panelInputSecondaryForeground',
    marginHorizontal: 8,
    marginVertical: 6,
  },
  button: {
    color: 'panelInputSecondaryForeground',
  },
  cancelButton: {
    backgroundColor: 'panelButton',
    borderRadius: 56,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonIcon: {
    color: 'panelForegroundLabel',
  },
  wrapper: {
    flex: 1,
  },
};

export default SearchBox;
