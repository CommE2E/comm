// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
import { KeyserverSelectionBottomSheetRouteName } from '../navigation/route-names.js';
import { useStyles, useColors } from '../themes/colors.js';

type Props = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionListItem(props: Props): React.Node {
  const { keyserverAdminUserInfo, keyserverInfo } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { navigate } = useNavigation();

  const onPress = React.useCallback(() => {
    navigate<'KeyserverSelectionBottomSheet'>({
      name: KeyserverSelectionBottomSheetRouteName,
      params: {
        keyserverAdminUserInfo,
        keyserverInfo,
      },
    });
  }, [keyserverAdminUserInfo, keyserverInfo, navigate]);

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
      <TouchableOpacity
        style={styles.keyserverListItemContainer}
        onPress={onPress}
      >
        <Pill
          label={keyserverAdminUserInfo.username}
          backgroundColor={colors.codeBackground}
          icon={cloudIcon}
        />
        <StatusIndicator connectionInfo={keyserverInfo.connection} />
      </TouchableOpacity>
    ),
    [
      cloudIcon,
      colors.codeBackground,
      keyserverAdminUserInfo.username,
      keyserverInfo.connection,
      onPress,
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
