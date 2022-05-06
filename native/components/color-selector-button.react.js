// @flow

import * as React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import tinycolor from 'tinycolor2';

import type { SetState } from 'lib/types/hook-types';

type ColorSelectorButtonProps = {
  +color: string,
  +pendingColor: string,
  +setPendingColor: SetState<string>,
};
function ColorSelectorButton(props: ColorSelectorButtonProps): React.Node {
  const { color, pendingColor, setPendingColor } = props;

  const colorSplotchStyle = React.useMemo(() => {
    return [styles.button, { backgroundColor: `#${color}` }];
  }, [color]);

  const onPendingColorSelected = React.useCallback(() => {
    setPendingColor(color);
  }, [setPendingColor, color]);

  const isSelected = tinycolor.equals(pendingColor, color);
  return (
    <View style={isSelected ? styles.outerRingSelected : styles.outerRing}>
      <TouchableOpacity
        style={colorSplotchStyle}
        onPress={onPendingColorSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    height: 40,
    margin: 10,
    width: 40,
  },
  outerRing: {
    borderRadius: 40,
    height: 60,
    margin: 5,
    width: 60,
  },
  outerRingSelected: {
    backgroundColor: '#404040',
    borderRadius: 40,
    height: 60,
    margin: 5,
    width: 60,
  },
});

export default ColorSelectorButton;
