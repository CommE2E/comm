// @flow

import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { selectedThreadColors } from 'lib/shared/thread-utils';

import ColorSelectorButton from './color-selector-button.react';

type ColorSelectorProps = {
  +currentColor: string,
};

function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor } = props;

  const colorSelectorButtons = React.useMemo(
    () =>
      selectedThreadColors.map(color => (
        <ColorSelectorButton
          key={color}
          color={color}
          currentColor={currentColor}
        />
      )),
    [currentColor],
  );

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.text}>Select thread color</Text>
      </View>
      <View style={styles.colorButtons}>{colorSelectorButtons}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  colorButtons: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  textContainer: {
    margin: 20,
  },
});

export default ColorSelector;
