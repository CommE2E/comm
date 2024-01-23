// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { MinimallyEncodedResolvedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import EditThreadAvatar from '../../avatars/edit-thread-avatar.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: MinimallyEncodedResolvedThreadInfo,
  +canChangeSettings: boolean,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const { threadInfo, canChangeSettings } = props;

  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.container}>
      <EditThreadAvatar disabled={!canChangeSettings} threadInfo={threadInfo} />
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
