// @flow

import type { Colors } from '../themes/colors';

import * as React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

type Props = {|
  fillType: 'flex' | 'absolute',
  colors: Colors,
|};
function ContentLoading(props: Props) {
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
  fullFlex: {
    flex: 1,
  },
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default ContentLoading;
