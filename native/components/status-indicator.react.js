// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { ConnectionInfo } from 'lib/types/socket-types.js';

import { useStyles } from '../themes/colors.js';

type Props = {
  +connectionInfo: ConnectionInfo,
};

function StatusIndicator(props: Props): React.Node {
  const { connectionInfo } = props;

  const styles = useStyles(unboundStyles);

  const isConnected = connectionInfo.status === 'connected';

  const { connectionIndicatorOuterStyle, connectionIndicatorInnerStyle } =
    React.useMemo(() => {
      const outerStyle = isConnected
        ? styles.onlineIndicatorOuter
        : styles.offlineIndicatorOuter;

      const innerStyle = isConnected
        ? styles.onlineIndicatorInner
        : styles.offlineIndicatorInner;

      return {
        connectionIndicatorOuterStyle: outerStyle,
        connectionIndicatorInnerStyle: innerStyle,
      };
    }, [
      isConnected,
      styles.offlineIndicatorInner,
      styles.offlineIndicatorOuter,
      styles.onlineIndicatorInner,
      styles.onlineIndicatorOuter,
    ]);

  return (
    <View style={connectionIndicatorOuterStyle}>
      <View style={connectionIndicatorInnerStyle} />
    </View>
  );
}

const unboundStyles = {
  onlineIndicatorOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'greenIndicatorOuter',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  onlineIndicatorInner: {
    backgroundColor: 'greenIndicatorInner',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  offlineIndicatorOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'redIndicatorOuter',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  offlineIndicatorInner: {
    backgroundColor: 'redIndicatorInner',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
};

export default StatusIndicator;
