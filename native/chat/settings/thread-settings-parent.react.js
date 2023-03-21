// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { useGetAvatarForThread } from 'lib/shared/avatar-utils.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedOptionalThreadInfo } from 'lib/utils/entity-helpers.js';

import Avatar from '../../components/avatar.react.js';
import Button from '../../components/button.react.js';
import ThreadPill from '../../components/thread-pill.react.js';
import { useStyles } from '../../themes/colors.js';
import { useShouldRenderAvatars } from '../../utils/avatar-utils.js';
import { useNavigateToThread } from '../message-list-types.js';

type Props = {
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
};
function ThreadSettingsParent(props: Props): React.Node {
  const { threadInfo, parentThreadInfo } = props;
  const styles = useStyles(unboundStyles);

  const navigateToThread = useNavigateToThread();
  const onPressParentThread = React.useCallback(() => {
    invariant(parentThreadInfo, 'should be set');
    navigateToThread({ threadInfo: parentThreadInfo });
  }, [parentThreadInfo, navigateToThread]);

  const resolvedParentThreadInfo =
    useResolvedOptionalThreadInfo(parentThreadInfo);

  const avatarInfo = useGetAvatarForThread(resolvedParentThreadInfo);
  const shouldRenderAvatars = useShouldRenderAvatars();

  const avatar = React.useMemo(() => {
    if (!resolvedParentThreadInfo || !shouldRenderAvatars) {
      return null;
    }

    return (
      <View style={styles.avatarContainer}>
        <Avatar size="small" avatarInfo={avatarInfo} />
      </View>
    );
  }, [
    avatarInfo,
    resolvedParentThreadInfo,
    shouldRenderAvatars,
    styles.avatarContainer,
  ]);

  let parent;
  if (parentThreadInfo) {
    parent = (
      <Button onPress={onPressParentThread} style={styles.parentContainer}>
        {avatar}
        <ThreadPill threadInfo={parentThreadInfo} />
      </Button>
    );
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

const ConnectedThreadSettingsParent: React.ComponentType<Props> =
  React.memo<Props>(ThreadSettingsParent);

export default ConnectedThreadSettingsParent;
