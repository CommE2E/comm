// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import { Text, View } from 'react-native';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { getCommunity } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from 'lib/types/thread-types-enum.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react.js';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react.js';
import MessagePreview from './message-preview.react.js';
import SwipeableThread from './swipeable-thread.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import Button from '../components/button.react.js';
import SingleLine from '../components/single-line.react.js';
import ThreadAncestorsLabel from '../components/thread-ancestors-label.react.js';
import UnreadDot from '../components/unread-dot.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +data: ChatThreadItem,
  +onPressItem: (
    threadInfo: ThreadInfo,
    pendingPersonalThreadUserInfo?: UserInfo,
  ) => void,
  +onPressSeeMoreSidebars: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId: string,
};
function ChatThreadListItem({
  data,
  onPressItem,
  onPressSeeMoreSidebars,
  onSwipeableWillOpen,
  currentlyOpenedSwipeableId,
}: Props): React.Node {
  const communityID = getCommunity(data.threadInfo);
  const communityInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return state.communityStore.communityInfos[communityID];
  });

  const farcasterChannelID = communityInfo?.farcasterChannelID;
  if (data.threadInfo.avatar?.type === 'farcaster' && farcasterChannelID) {
    console.log(`rendering ChatThreadListItem for ${farcasterChannelID}`);
  }
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const numOfSidebarsWithExtendedArrow =
    data.sidebars.filter(sidebarItem => sidebarItem.type === 'sidebar').length -
    1;

  const sidebars = React.useMemo(
    () =>
      data.sidebars.map((sidebarItem, index) => {
        if (sidebarItem.type === 'sidebar') {
          return (
            <ChatThreadListSidebar
              sidebarItem={sidebarItem}
              onPressItem={onPressItem}
              onSwipeableWillOpen={onSwipeableWillOpen}
              currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
              key={sidebarItem.threadInfo.id}
              extendArrow={index < numOfSidebarsWithExtendedArrow}
            />
          );
        } else if (sidebarItem.type === 'seeMore') {
          return (
            <ChatThreadListSeeMoreSidebars
              threadInfo={data.threadInfo}
              unread={sidebarItem.unread}
              onPress={onPressSeeMoreSidebars}
              key="seeMore"
            />
          );
        } else {
          return <View style={styles.spacer} key="spacer" />;
        }
      }),
    [
      currentlyOpenedSwipeableId,
      data.sidebars,
      data.threadInfo,
      numOfSidebarsWithExtendedArrow,
      onPressItem,
      onPressSeeMoreSidebars,
      onSwipeableWillOpen,
      styles.spacer,
    ],
  );

  const onPress = React.useCallback(() => {
    onPressItem(data.threadInfo, data.pendingPersonalThreadUserInfo);
  }, [onPressItem, data.threadInfo, data.pendingPersonalThreadUserInfo]);

  const threadNameStyle = React.useMemo(() => {
    if (!data.threadInfo.currentUser.unread) {
      return styles.threadName;
    }
    return [styles.threadName, styles.unreadThreadName];
  }, [
    data.threadInfo.currentUser.unread,
    styles.threadName,
    styles.unreadThreadName,
  ]);

  const lastActivity = shortAbsoluteDate(data.lastUpdatedTime);
  const lastActivityStyle = React.useMemo(() => {
    if (!data.threadInfo.currentUser.unread) {
      return styles.lastActivity;
    }
    return [styles.lastActivity, styles.unreadLastActivity];
  }, [
    data.threadInfo.currentUser.unread,
    styles.lastActivity,
    styles.unreadLastActivity,
  ]);

  const resolvedThreadInfo = useResolvedThreadInfo(data.threadInfo);

  const unreadDot = React.useMemo(
    () => (
      <View style={styles.avatarContainer}>
        <UnreadDot unread={data.threadInfo.currentUser.unread} />
      </View>
    ),
    [data.threadInfo.currentUser.unread, styles.avatarContainer],
  );

  const threadAvatar = React.useMemo(
    () => (
      <View style={styles.avatarContainer}>
        <ThreadAvatar size="M" threadInfo={data.threadInfo} />
      </View>
    ),
    [data.threadInfo, styles.avatarContainer],
  );

  const isThick = threadTypeIsThick(data.threadInfo.type);
  const iconStyle = data.threadInfo.currentUser.unread
    ? styles.iconUnread
    : styles.iconRead;

  const iconName = isThick ? 'lock' : 'server';

  const threadDetails = React.useMemo(
    () => (
      <View style={styles.threadDetails}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name={iconName} size={12} style={iconStyle} />
          </View>
          <ThreadAncestorsLabel threadInfo={data.threadInfo} />
        </View>
        <View style={styles.row}>
          <SingleLine style={threadNameStyle}>
            {resolvedThreadInfo.uiName}
          </SingleLine>
        </View>
        <View style={styles.row}>
          <MessagePreview threadInfo={data.threadInfo} />
          <Text style={lastActivityStyle}>{lastActivity}</Text>
        </View>
      </View>
    ),
    [
      iconStyle,
      data.threadInfo,
      iconName,
      lastActivity,
      lastActivityStyle,
      resolvedThreadInfo.uiName,
      styles.header,
      styles.iconContainer,
      styles.row,
      styles.threadDetails,
      threadNameStyle,
    ],
  );

  const swipeableThreadContent = React.useMemo(
    () => (
      <Button
        onPress={onPress}
        iosFormat="highlight"
        iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
        iosActiveOpacity={0.85}
        style={styles.container}
      >
        <View style={styles.content}>
          {unreadDot}
          {threadAvatar}
          {threadDetails}
        </View>
      </Button>
    ),
    [
      colors.listIosHighlightUnderlay,
      onPress,
      styles.container,
      styles.content,
      threadAvatar,
      threadDetails,
      unreadDot,
    ],
  );

  const swipeableThread = React.useMemo(
    () => (
      <SwipeableThread
        threadInfo={data.threadInfo}
        mostRecentNonLocalMessage={data.mostRecentNonLocalMessage}
        onSwipeableWillOpen={onSwipeableWillOpen}
        currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
        iconSize={24}
      >
        {swipeableThreadContent}
      </SwipeableThread>
    ),
    [
      currentlyOpenedSwipeableId,
      data.mostRecentNonLocalMessage,
      data.threadInfo,
      onSwipeableWillOpen,
      swipeableThreadContent,
    ],
  );

  const chatThreadListItem = React.useMemo(
    () => (
      <>
        {swipeableThread}
        {sidebars}
      </>
    ),
    [sidebars, swipeableThread],
  );

  return chatThreadListItem;
}

const chatThreadListItemHeight = 70;
const spacerHeight = 6;
const unboundStyles = {
  container: {
    height: chatThreadListItemHeight,
    justifyContent: 'center',
    backgroundColor: 'listBackground',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarContainer: {
    marginLeft: 6,
    marginBottom: 12,
  },
  threadDetails: {
    paddingLeft: 12,
    paddingRight: 18,
    justifyContent: 'center',
    flex: 1,
    marginTop: 5,
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 14,
    marginLeft: 10,
  },
  unreadLastActivity: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadName: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 21,
  },
  unreadThreadName: {
    color: 'listForegroundLabel',
    fontWeight: '500',
  },
  spacer: {
    height: spacerHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 6,
  },
  iconRead: {
    color: 'listForegroundTertiaryLabel',
  },
  iconUnread: {
    color: 'listForegroundLabel',
  },
};

export { ChatThreadListItem, chatThreadListItemHeight, spacerHeight };
