// @flow

import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tinycolor from 'tinycolor2';

import { selectedThreadColors } from 'lib/shared/color-utils.js';

import ColorSelectorButton from './color-selector-button.react.js';
import { useStyles } from '../themes/colors.js';

type ColorSelectorProps = {
  +currentColor: string,
  +windowWidth: number,
  +onColorSelected: (hex: string) => void,
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor, onColorSelected } = props;
  const [pendingColor, setPendingColor] = React.useState(currentColor);
  const styles = useStyles(unboundStyles);

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

  const firstRow = React.useMemo(
    () => colorSelectorButtons.slice(0, colorSelectorButtons.length / 2),
    [colorSelectorButtons],
  );

  const secondRow = React.useMemo(
    () => colorSelectorButtons.slice(colorSelectorButtons.length / 2),
    [colorSelectorButtons],
  );

  const saveButtonDisabled = tinycolor.equals(currentColor, pendingColor);
  const saveButtonStyle = React.useMemo(
    () => [
      styles.saveButton,
      {
        backgroundColor: saveButtonDisabled ? '#404040' : `#${pendingColor}`,
        width: 0.75 * props.windowWidth,
      },
    ],
    [styles.saveButton, saveButtonDisabled, pendingColor, props.windowWidth],
  );

  const onColorSplotchSaved = React.useCallback(() => {
    onColorSelected(`#${pendingColor}`);
  }, [onColorSelected, pendingColor]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select chat color</Text>
      <View style={styles.colorButtons}>{firstRow}</View>
      <View style={styles.colorButtons}>{secondRow}</View>
      <TouchableOpacity
        style={saveButtonStyle}
        onPress={onColorSplotchSaved}
        disabled={saveButtonDisabled}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  colorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  container: {
    alignItems: 'center',
    flex: 1,
  },
  header: {
    color: 'modalForegroundLabel',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 5,
    margin: 10,
    padding: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
  },
};

export default ColorSelector;
