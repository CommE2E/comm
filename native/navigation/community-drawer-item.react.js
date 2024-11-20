// @flow

import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { getCommunity } from 'lib/shared/thread-utils.js';
import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import CommunityActionsButton from '../components/community-actions-button.react.js';
import SingleLine from '../components/single-line.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { CommunityDrawerItemDataFlattened } from '../utils/drawer-utils.react.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemDataFlattened,
  +toggleExpanded: (threadID: string) => void,
  +isExpanded: boolean,
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
    isExpanded,
    toggleExpanded,
  } = props;

  const communityID = getCommunity(threadInfo);
  const communityInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return state.communityStore.communityInfos[communityID];
  });

  const farcasterChannelID = communityInfo?.farcasterChannelID;
  if (threadInfo.avatar?.type === 'farcaster' && farcasterChannelID) {
    console.log(`rendering CommunityDrawerItem for ${farcasterChannelID}`);
  }

  const styles = useStyles(unboundStyles);

  const subchannelsButton = React.useMemo(() => {
    if (isExpanded && hasSubchannelsButton) {
      return (
        <View style={styles.subchannelsButton}>
          <SubchannelsButton threadInfo={threadInfo} />
        </View>
      );
    }
    return null;
  }, [isExpanded, hasSubchannelsButton, styles.subchannelsButton, threadInfo]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!hasChildren && !hasSubchannelsButton) {
      return <ExpandButtonDisabled />;
    }
    return <ExpandButton onPress={onExpandToggled} expanded={isExpanded} />;
  }, [hasChildren, hasSubchannelsButton, onExpandToggled, isExpanded]);

  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const containerStyle = React.useMemo(
    () => [
      styles.container,
      {
        paddingLeft: itemStyle.indentation,
      },
      styles[itemStyle.background],
    ],
    [itemStyle.indentation, itemStyle.background, styles],
  );

  const communityActionsButton = React.useMemo(() => {
    if (!threadTypeIsCommunityRoot(threadInfo.type)) {
      return null;
    }
    return <CommunityActionsButton community={threadInfo} />;
  }, [threadInfo]);

  return (
    <View style={containerStyle}>
      <View style={styles.threadEntry}>
        {itemExpandButton}
        <TouchableOpacity
          onPress={onPress}
          style={styles.textTouchableWrapper}
          onLongPress={onExpandToggled}
        >
          <View style={styles.avatarContainer}>
            <ThreadAvatar size="XS" threadInfo={threadInfo} />
          </View>
          <SingleLine style={labelStyle}>{uiName}</SingleLine>
        </TouchableOpacity>
        {communityActionsButton}
      </View>
      {subchannelsButton}
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingRight: 8,
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
    marginRight: 24,
  },
  subchannelsButton: {
    marginLeft: 24,
    marginBottom: 6,
  },
};

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItem);

export default MemoizedCommunityDrawerItem;
