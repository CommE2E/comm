// @flow

import * as React from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';

import { type ResolvedThreadInfo } from 'lib/types/thread-types.js';

import SWMansionIcon from '../../components/swmansion-icon.react.js';
import ThreadAvatar from '../../components/thread-avatar.react.js';
import { useColors, useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
  +canChangeSettings: boolean,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const { threadInfo, canChangeSettings } = props;

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const onPressEditAvatar = React.useCallback(() => {
    // TODO:
    // Display action sheet with all the different avatar creation options
  }, []);

  const editBadge = React.useMemo(() => {
    if (!canChangeSettings) {
      return null;
    }

    return (
      <View style={styles.editAvatarIconContainer}>
        <SWMansionIcon
          name="edit-2"
          size={16}
          style={styles.editAvatarIcon}
          color={colors.floatingButtonLabel}
        />
      </View>
    );
  }, [
    canChangeSettings,
    colors.floatingButtonLabel,
    styles.editAvatarIcon,
    styles.editAvatarIconContainer,
  ]);

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPress={onPressEditAvatar}
        disabled={!canChangeSettings}
      >
        <View>
          <ThreadAvatar size="profile" threadInfo={threadInfo} />
          {editBadge}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const unboundStyles = {
  container: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingVertical: 16,
  },
  editAvatarIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'panelForeground',
    borderRadius: 18,
    width: 36,
    height: 36,
    backgroundColor: 'purpleButton',
    justifyContent: 'center',
  },
  editAvatarIcon: {
    textAlign: 'center',
  },
};

const MemoizedThreadSettingsAvatar: React.ComponentType<Props> =
  React.memo<Props>(ThreadSettingsAvatar);

export default MemoizedThreadSettingsAvatar;
