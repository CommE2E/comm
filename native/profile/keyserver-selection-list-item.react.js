// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';

import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import { useStyles, useColors } from '../themes/colors.js';

type Props = {
  +keyserverAdminUsername: string,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionListItem(props: Props): React.Node {
  const { keyserverAdminUsername, keyserverInfo } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const cloudIcon = React.useMemo(
    () => (
      <CommIcon
        name="cloud-filled"
        size={12}
        color={colors.panelForegroundLabel}
      />
    ),
    [colors.panelForegroundLabel],
  );

  const isConnected = keyserverInfo.connection.status === 'connected';

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

  const keyserverListItem = React.useMemo(
    () => (
      <View style={styles.keyserverListItemContainer}>
        <Pill
          label={keyserverAdminUsername}
          backgroundColor={colors.codeBackground}
          icon={cloudIcon}
        />
        <View style={connectionIndicatorOuterStyle}>
          <View style={connectionIndicatorInnerStyle} />
        </View>
      </View>
    ),
    [
      cloudIcon,
      colors.codeBackground,
      connectionIndicatorInnerStyle,
      connectionIndicatorOuterStyle,
      keyserverAdminUsername,
      styles.keyserverListItemContainer,
    ],
  );

  return keyserverListItem;
}

const unboundStyles = {
  keyserverListItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
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

export default KeyserverSelectionListItem;
