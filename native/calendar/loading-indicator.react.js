// @flow

import type { LoadingStatus } from 'lib/types/loading-types';

import * as React from 'react';
import { ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

type Props = {|
  loadingStatus: LoadingStatus,
  color: string,
  canUseRed: boolean,
|};
function LoadingIndicator(props: Props) {
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
    paddingTop: Platform.OS === 'android' ? 6 : 4,
    fontSize: 16,
  },
});

export default LoadingIndicator;
