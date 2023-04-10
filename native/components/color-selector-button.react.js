// @flow

import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import tinycolor from 'tinycolor2';

import type { SetState } from 'lib/types/hook-types.js';

import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type ColorSelectorButtonProps = {
  +color: string,
  +pendingColor: string,
  +setPendingColor: SetState<string>,
  +outerRingSelectedColorStyle?: ViewStyle,
};
function ColorSelectorButton(props: ColorSelectorButtonProps): React.Node {
  const { color, pendingColor, setPendingColor, outerRingSelectedColorStyle } =
    props;
  const styles = useStyles(unboundStyles);

  const colorSplotchStyle = React.useMemo(() => {
    return [styles.button, { backgroundColor: `#${color}` }];
  }, [color, styles.button]);

  const outerRingSelectedStyle = React.useMemo(() => {
    const result = [styles.outerRingSelected];
    if (outerRingSelectedColorStyle) {
      result.push(outerRingSelectedColorStyle);
    }

    return result;
  }, [outerRingSelectedColorStyle, styles.outerRingSelected]);

  const onPendingColorSelected = React.useCallback(() => {
    setPendingColor(color);
  }, [setPendingColor, color]);

  const isSelected = tinycolor.equals(pendingColor, color);
  return (
    <View style={isSelected ? outerRingSelectedStyle : styles.outerRing}>
      <TouchableOpacity
        style={colorSplotchStyle}
        onPress={onPendingColorSelected}
      />
    </View>
  );
}

const unboundStyles = {
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
    backgroundColor: 'modalForegroundBorder',
    borderRadius: 30,
    height: 60,
    margin: 5,
    width: 60,
  },
};

export default ColorSelectorButton;
