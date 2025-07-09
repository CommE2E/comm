// @flow

import * as React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';

import SWMansionIcon from './swmansion-icon.react.js';
import { useColors } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';

type Props = {
  +onPress: () => void,
  +canChangeSettings?: boolean,
  +style?: TextStyle,
};
function EditSettingButton(props: Props): React.Node {
  const { onPress, canChangeSettings = true, style } = props;
  const colors = useColors();

  const appliedStyles = React.useMemo(() => {
    const stylesArr: Array<TextStyle> = [styles.editIcon];
    if (style) {
      stylesArr.push(style);
    }
    return stylesArr;
  }, [style]);

  if (!canChangeSettings) {
    return null;
  }

  const { modalForegroundSecondaryLabel } = colors;
  return (
    <TouchableOpacity onPress={onPress}>
      <SWMansionIcon
        name="edit-1"
        size={20}
        style={appliedStyles}
        color={modalForegroundSecondaryLabel}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  editIcon: {
    paddingLeft: 10,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
});

export default EditSettingButton;
