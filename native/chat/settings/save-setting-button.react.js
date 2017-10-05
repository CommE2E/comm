// @flow

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = {|
  onPress: () => void,
|};
function SaveSettingButton(props: Props) {
  return (
    <TouchableOpacity onPress={props.onPress} style={styles.container}>
      <Icon
        name="md-checkbox-outline"
        size={24}
        style={styles.editIcon}
        color="#009900"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  editIcon: {
    paddingLeft: 10,
    paddingTop: 6,
    textAlign: 'right',
    lineHeight: 16,
  },
  container: {
    height: 16,
  },
});

export default SaveSettingButton;
