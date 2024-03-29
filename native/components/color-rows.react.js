// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { selectedThreadColors } from 'lib/shared/color-utils.js';
import type { SetState } from 'lib/types/hook-types.js';

import ColorSelectorButton from './color-selector-button.react.js';
import type { ViewStyle } from '../types/styles.js';

type Props = {
  +pendingColor: string,
  +setPendingColor: SetState<string>,
  +outerRingSelectedColorStyle?: ViewStyle,
};

function ColorRows(props: Props): React.Node {
  const { pendingColor, setPendingColor, outerRingSelectedColorStyle } = props;

  const colorSelectorButtons = React.useMemo(
    () =>
      selectedThreadColors.map(color => (
        <ColorSelectorButton
          key={color}
          color={color}
          pendingColor={pendingColor}
          setPendingColor={setPendingColor}
          outerRingSelectedColorStyle={outerRingSelectedColorStyle}
        />
      )),
    [outerRingSelectedColorStyle, pendingColor, setPendingColor],
  );

  const firstRow = React.useMemo(
    () => colorSelectorButtons.slice(0, colorSelectorButtons.length / 2),
    [colorSelectorButtons],
  );

  const secondRow = React.useMemo(
    () => colorSelectorButtons.slice(colorSelectorButtons.length / 2),
    [colorSelectorButtons],
  );

  return (
    <>
      <View style={styles.colorRowContainer}>{firstRow}</View>
      <View style={styles.colorRowContainer}>{secondRow}</View>
    </>
  );
}

const styles = StyleSheet.create({
  colorRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
});

export default ColorRows;
