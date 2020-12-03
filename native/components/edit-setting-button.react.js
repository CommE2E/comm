// @flow

import * as React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { useColors } from '../themes/colors';
import type { TextStyle } from '../types/styles';

type Props = {|
  +onPress: () => void,
  +canChangeSettings: boolean,
  +style?: TextStyle,
|};
function EditSettingButton(props: Props) {
  const colors = useColors();
  if (!props.canChangeSettings) {
    return null;
  }
  const appliedStyles = [styles.editIcon];
  if (props.style) {
    appliedStyles.push(props.style);
  }
  const { link: linkColor } = colors;
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Icon name="pencil" size={16} style={appliedStyles} color={linkColor} />
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
