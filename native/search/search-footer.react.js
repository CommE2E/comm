// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';

function SearchFooter(props: { text: string }): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.messageWrapper}>
      <Text style={styles.message}>{props.text}</Text>
    </View>
  );
}

const unboundStyles = {
  message: {
    color: 'panelInputSecondaryForeground',
    size: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  messageWrapper: {
    paddingVertical: 24,
    display: 'flex',
  },
};

export default SearchFooter;
