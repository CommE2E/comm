// @flow

import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import { SingleLine } from '../components/single-line.react.js';
import InviteLinksButton from '../invite-links/invite-links-button.react.js';
import { useStyles } from '../themes/colors.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';
import type { CommunityDrawerItemDataFlattened } from '../utils/drawer-utils.react.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemDataFlattened,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
  +navigateToThread: (params: MessageListParams) => void,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: {
      threadInfo,
      labelStyle,
      hasSubchannelsButton,
      hasChildren,
      itemStyle,
    },
    navigateToThread,
    expanded,
    toggleExpanded,
  } = props;

  const styles = useStyles(unboundStyles);

  const subchannelsButton = React.useMemo(() => {
    if (expanded && hasSubchannelsButton) {
      return (
        <View style={styles.subchannelsButton}>
          <SubchannelsButton threadInfo={threadInfo} />
        </View>
      );
    }
    return null;
  }, [expanded, hasSubchannelsButton, styles.subchannelsButton, threadInfo]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!hasChildren && !hasSubchannelsButton) {
      return <ExpandButtonDisabled />;
    }
    return <ExpandButton onPress={onExpandToggled} expanded={expanded} />;
  }, [hasChildren, hasSubchannelsButton, onExpandToggled, expanded]);

  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const shouldRenderAvatars = useShouldRenderAvatars();

  const avatar = React.useMemo(() => {
    if (!shouldRenderAvatars) {
      return null;
    }

    return (
      <View style={styles.avatarContainer}>
        <ThreadAvatar size="micro" threadInfo={threadInfo} />
      </View>
    );
  }, [shouldRenderAvatars, styles.avatarContainer, threadInfo]);

  const containerStyle = React.useMemo(
    () => [
      styles.container,
      {
        paddingLeft: itemStyle.indentation,
      },
      styles[itemStyle.background],
    ],
    [itemStyle, styles],
  );

  return (
    <View style={containerStyle}>
      <View style={styles.threadEntry}>
        {itemExpandButton}
        <TouchableOpacity
          onPress={onPress}
          style={styles.textTouchableWrapper}
          onLongPress={onExpandToggled}
        >
          {avatar}
          <SingleLine style={labelStyle}>{uiName}</SingleLine>
        </TouchableOpacity>
        <InviteLinksButton community={threadInfo} />
      </View>
      {subchannelsButton}
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingRight: 24,
  },
  none: {
    paddingVertical: 2,
  },
  beginning: {
    backgroundColor: 'drawerOpenCommunityBackground',
    borderTopRightRadius: 8,
    paddingTop: 2,
  },
  middle: {
    backgroundColor: 'drawerOpenCommunityBackground',
    paddingRight: 24,
  },
  end: {
    backgroundColor: 'drawerOpenCommunityBackground',
    borderBottomRightRadius: 8,
    paddingBottom: 2,
  },
  avatarContainer: {
    marginRight: 8,
  },
  threadEntry: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  textTouchableWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subchannelsButton: {
    marginLeft: 24,
    marginBottom: 6,
  },
};

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItem);

export default MemoizedCommunityDrawerItem;
