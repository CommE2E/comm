// @flow

import * as React from 'react';
import { ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Icon from '@expo/vector-icons/Feather';

import type { LoadingStatus } from 'lib/types/loading-types';

type Props = {
  +loadingStatus: LoadingStatus,
  +color: string,
  +canUseRed: boolean,
};
function LoadingIndicator(props: Props): React.Node {
  if (props.loadingStatus === 'error') {
    const colorStyle = props.canUseRed
      ? { color: 'red' }
      : { color: props.color };
    return <Icon name="x-circle" style={[styles.errorIcon, colorStyle]} />;
  } else if (props.loadingStatus === 'loading') {
    return <ActivityIndicator size="small" color={props.color} />;
  } else {
    return null;
  }
}

const styles = StyleSheet.create({
  errorIcon: {
    fontSize: 16,
    paddingTop: Platform.OS === 'android' ? 6 : 4,
  },
});

export default LoadingIndicator;
