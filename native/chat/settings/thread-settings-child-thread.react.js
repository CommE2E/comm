// @flow

import * as React from 'react';
import { View, Platform } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Avatar from '../../components/avatar.react.js';
import Button from '../../components/button.react.js';
import ThreadIcon from '../../components/thread-icon.react.js';
import ThreadPill from '../../components/thread-pill.react.js';
import { useColors, useStyles } from '../../themes/colors.js';
import { useShouldRenderAvatars } from '../../utils/avatar-utils.js';
import { useNavigateToThread } from '../message-list-types.js';

type Props = {
  +threadInfo: ThreadInfo,
  +firstListItem: boolean,
  +lastListItem: boolean,
};
function ThreadSettingsChildThread(props: Props): React.Node {
  const { threadInfo } = props;

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [threadInfo, navigateToThread]);

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);
  const avatarInfo = useGetAvatarForThread(resolvedThreadInfo);
  const shouldRenderAvatars = useShouldRenderAvatars();

  const avatar = React.useMemo(() => {
    if (!shouldRenderAvatars) {
      return null;
    }
    return (
      <View style={styles.avatarContainer}>
        <Avatar size="small" avatarInfo={avatarInfo} />
      </View>
    );
  }, [avatarInfo, shouldRenderAvatars, styles.avatarContainer]);

  const firstItem = props.firstListItem ? null : styles.topBorder;
  const lastItem = props.lastListItem ? styles.lastButton : null;
  return (
    <View style={styles.container}>
      <Button onPress={onPress} style={[styles.button, firstItem, lastItem]}>
        <View style={styles.leftSide}>
          {avatar}
          <ThreadPill threadInfo={threadInfo} />
        </View>
        <ThreadIcon
          threadType={threadInfo.type}
          color={colors.panelForegroundSecondaryLabel}
        />
      </Button>
    </View>
  );
}

const unboundStyles = {
  avatarContainer: {
    marginRight: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    alignItems: 'center',
  },
  topBorder: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  container: {
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingHorizontal: 12,
  },
  lastButton: {
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 8,
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
};

export default ThreadSettingsChildThread;
