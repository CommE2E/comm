// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import { type ResolvedThreadInfo } from 'lib/types/thread-types.js';

import Avatar from '../../components/avatar.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const avatarInfo = useGetAvatarForThread(props.threadInfo);

  return (
    <View style={styles.container}>
      <Avatar size="profile" avatarInfo={avatarInfo} />
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
};

const MemoizedThreadSettingsAvatar: React.ComponentType<Props> =
  React.memo<Props>(ThreadSettingsAvatar);

export default MemoizedThreadSettingsAvatar;
