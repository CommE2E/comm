// @flow

import * as React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import tinycolor from 'tinycolor2';

import { selectedThreadColors } from 'lib/shared/thread-utils';

import ColorSelectorButton from './color-selector-button.react';

type ColorSelectorProps = {
  +currentColor: string,
  +onColorSelected: (hex: string) => void,
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor, onColorSelected } = props;
  const [pendingColor, setPendingColor] = React.useState(currentColor);

  const colorSelectorButtons = React.useMemo(
    () =>
      selectedThreadColors.map(color => (
        <ColorSelectorButton
          key={color}
          color={color}
          pendingColor={pendingColor}
          setPendingColor={setPendingColor}
        />
      )),
    [pendingColor],
  );

  const saveButtonDisabled = tinycolor.equals(currentColor, pendingColor);
  const saveButtonStyle = React.useMemo(
    () => [
      styles.saveButton,
      { backgroundColor: saveButtonDisabled ? '#404040' : `#${pendingColor}` },
    ],
    [saveButtonDisabled, pendingColor],
  );

  const onColorSplotchSaved = React.useCallback(() => {
    onColorSelected(`#${pendingColor}`);
  }, [onColorSelected, pendingColor]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select thread color</Text>
      <View style={styles.colorButtons}>{colorSelectorButtons}</View>
      <View style={saveButtonStyle}>
        <Button
          title="Save"
          color="white"
          onPress={onColorSplotchSaved}
          disabled={saveButtonDisabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colorButtons: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
  },
  saveButton: {
    borderRadius: 5,
    margin: 10,
    padding: 5,
    width: 320,
  },
});

export default ColorSelector;
