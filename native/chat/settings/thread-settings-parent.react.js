// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import Avatar from '../../components/avatar.react.js';
import Button from '../../components/button.react.js';
import ThreadPill from '../../components/thread-pill.react.js';
import { useStyles } from '../../themes/colors.js';
import { useShouldRenderAvatars } from '../../utils/avatar-utils.js';
import { useNavigateToThread } from '../message-list-types.js';

type ParentButtonProps = {
  +parentThreadInfo: ThreadInfo,
};
function ParentButton(props: ParentButtonProps): React.Node {
  const styles = useStyles(unboundStyles);

  const navigateToThread = useNavigateToThread();

  const onPressParentThread = React.useCallback(() => {
    navigateToThread({ threadInfo: props.parentThreadInfo });
  }, [props.parentThreadInfo, navigateToThread]);

  const avatarInfo = useGetAvatarForThread(props.parentThreadInfo);
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

  return (
    <Button onPress={onPressParentThread} style={styles.parentContainer}>
      {avatar}
      <ThreadPill threadInfo={props.parentThreadInfo} />
    </Button>
  );
}

type ThreadSettingsParentProps = {
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
};
function ThreadSettingsParent(props: ThreadSettingsParentProps): React.Node {
  const { threadInfo, parentThreadInfo } = props;
  const styles = useStyles(unboundStyles);

  let parent;
  if (parentThreadInfo) {
    parent = <ParentButton parentThreadInfo={parentThreadInfo} />;
  } else if (threadInfo.parentThreadID) {
    parent = (
      <Text
        style={[styles.currentValue, styles.currentValueText, styles.noParent]}
        numberOfLines={1}
      >
        Secret parent
      </Text>
    );
  } else {
    parent = (
      <Text
        style={[styles.currentValue, styles.currentValueText, styles.noParent]}
        numberOfLines={1}
      >
        No parent
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        Parent
      </Text>
      {parent}
    </View>
  );
}

const unboundStyles = {
  avatarContainer: {
    marginRight: 8,
  },
  currentValue: {
    flex: 1,
  },
  currentValueText: {
    color: 'panelForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingRight: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  parentContainer: {
    flexDirection: 'row',
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 4,
    alignItems: 'center',
  },
};

const ConnectedThreadSettingsParent: React.ComponentType<ThreadSettingsParentProps> =
  React.memo<ThreadSettingsParentProps>(ThreadSettingsParent);

export default ConnectedThreadSettingsParent;
