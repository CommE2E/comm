// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors';

function AppsDirectory() {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.view}>
      <Text style={styles.placeHolderText}>placeholder apps view</Text>
    </View>
  );
}

const unboundStyles = {
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeHolderText: {
    color: 'white',
  },
};

export default AppsDirectory;
