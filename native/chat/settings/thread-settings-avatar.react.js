// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Avatar from '../../components/avatar.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: ThreadInfo,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const resolvedThreadInfo = useResolvedThreadInfo(props.threadInfo);

  const styles = useStyles(unboundStyles);
  const avatarInfo = useGetAvatarForThread(resolvedThreadInfo);

  const avatar = React.useMemo(
    () => <Avatar size="profile" avatarInfo={avatarInfo} />,
    [avatarInfo],
  );

  return <View style={styles.container}>{avatar}</View>;
}

const unboundStyles = {
  container: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingVertical: 16,
  },
};

export default ThreadSettingsAvatar;
