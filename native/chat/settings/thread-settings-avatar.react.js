// @flow

import * as React from 'react';
import { View } from 'react-native';

import { type ResolvedThreadInfo } from 'lib/types/thread-types.js';

import ThreadAvatar from '../../components/thread-avatar.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.container}>
      <ThreadAvatar size="profile" threadID={props.threadInfo.id} />
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
