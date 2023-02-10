// @flow

import * as React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import type { Colors } from '../themes/colors.js';

type Props = {
  +fillType: 'flex' | 'absolute',
  +colors: Colors,
};
function ContentLoading(props: Props): React.Node {
  const viewStyle =
    props.fillType === 'flex' ? styles.fullFlex : styles.absoluteContainer;
  return (
    <View style={viewStyle}>
      <ActivityIndicator
        color={props.colors.listSeparatorLabel}
        size="large"
        style={styles.fullFlex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fullFlex: {
    flex: 1,
  },
});

export default ContentLoading;
