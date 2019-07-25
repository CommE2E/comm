// @flow

import * as React from 'react';
import { StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

function PencilIcon(props: {||}) {
  return (
    <Icon
      name="pencil"
      size={16}
      style={styles.editIcon}
      color="#036AFF"
    />
  );
}

const styles = StyleSheet.create({
  editIcon: {
    lineHeight: 20,
    paddingLeft: 10,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
});

export default PencilIcon;
