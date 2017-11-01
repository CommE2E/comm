// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

type Props = {|
  onPress: () => void,
  canChangeSettings: bool,
  style?: StyleObj,
|};
function EditSettingButton(props: Props) {
  if (!props.canChangeSettings) {
    return null;
  }
  const appliedStyles = [styles.editIcon];
  if (props.style) {
    appliedStyles.push(props.style);
  }
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Icon
        name="pencil"
        size={16}
        style={appliedStyles}
        color="#036AFF"
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
