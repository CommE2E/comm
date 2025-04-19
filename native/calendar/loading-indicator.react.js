// @flow

import Icon from '@expo/vector-icons/Feather.js';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, Platform } from 'react-native';

import type { LoadingStatus } from 'lib/types/loading-types.js';

type Props = {
  +loadingStatus: LoadingStatus,
  +color: string,
  +canUseRed: boolean,
};
function LoadingIndicator(props: Props): React.Node {
  const errorStyle = React.useMemo(() => {
    const errorColorStyle = props.canUseRed
      ? { color: 'red' }
      : { color: props.color };
    return [styles.errorIcon, errorColorStyle];
  }, [props.canUseRed, props.color]);
  if (props.loadingStatus === 'error') {
    return <Icon name="x-circle" style={errorStyle} />;
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
