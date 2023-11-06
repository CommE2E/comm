// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';

import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
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

  const keyserverListItem = React.useMemo(
    () => (
      <View style={styles.keyserverListItemContainer}>
        <Pill
          label={keyserverAdminUsername}
          backgroundColor={colors.codeBackground}
          icon={cloudIcon}
        />
        <StatusIndicator connectionInfo={keyserverInfo.connection} />
      </View>
    ),
    [
      cloudIcon,
      colors.codeBackground,
      keyserverAdminUsername,
      keyserverInfo.connection,
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
};

export default KeyserverSelectionListItem;
