// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, Text } from 'react-native';

import TextInput from '../components/text-input.react.js';
import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import { useStyles, useColors } from '../themes/colors.js';

// eslint-disable-next-line no-unused-vars
function AddKeyserver(props: { ... }): React.Node {
  const { setOptions } = useNavigation();

  const { panelForegroundTertiaryLabel } = useColors();
  const styles = useStyles(unboundStyles);

  const [urlInput, setUrlInput] = React.useState('');

  const onPressSave = React.useCallback(() => {
    // TODO
  }, []);

  React.useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/display-name
      headerRight: () => (
        <HeaderRightTextButton label="Save" onPress={onPressSave} />
      ),
    });
  }, [onPressSave, setOptions, styles.header]);

  const onChangeText = React.useCallback(
    (text: string) => setUrlInput(text),
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>KEYSERVER URL</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={onChangeText}
            placeholder="Keyserver URL"
            placeholderTextColor={panelForegroundTertiaryLabel}
            autoFocus={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingTop: 8,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
};

export default AddKeyserver;
