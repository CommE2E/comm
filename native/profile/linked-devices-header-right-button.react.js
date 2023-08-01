// @flow

import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';

function LinkedDevicesHeaderRightButton(): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <TouchableOpacity onPress={null}>
      <Text style={styles.textStyle}>Add</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  textStyle: {
    color: 'headerChevron',
    fontSize: 16,
    marginRight: 10,
  },
};

export default LinkedDevicesHeaderRightButton;
