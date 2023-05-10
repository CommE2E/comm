// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';

function Statement(props: { text: string }): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.emptyQueryMessageWrapper}>
      <Text style={styles.emptyQueryMessage}>{props.text}</Text>
    </View>
  );
}

const unboundStyles = {
  emptyQueryMessage: {
    color: 'searchMessagesSecondaryForeground',
    size: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyQueryMessageWrapper: {
    paddingVertical: 24,
    display: 'flex',
  },
};

export default Statement;
