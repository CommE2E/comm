// @flow

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

type Props = {|
  onPress: () => void,
  canChangeSettings: bool,
|};
function EditSettingButton(props: Props) {
  if (!props.canChangeSettings) {
    return null;
  }
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Icon
        name="pencil"
        size={20}
        style={styles.editIcon}
        color="#0348BB"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  editIcon: {
    paddingLeft: 10,
    textAlign: 'right',
  },
});

export default EditSettingButton;
