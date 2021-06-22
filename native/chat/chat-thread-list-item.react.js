// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import Button from '../components/button.react';
import ColorSplotch from '../components/color-splotch.react';
import { SingleLine } from '../components/single-line.react';
import ThreadAncestorsLabel from '../components/thread-ancestors-label.react';
import { useColors, useStyles } from '../themes/colors';
import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react';
import MessagePreview from './message-preview.react';
import SwipeableThread from './swipeable-thread.react';

type Props = {|
  +data: ChatThreadItem,
  +onPressItem: (
    data: ThreadInfo,
    pendingPersonalThreadUserInfo?: UserInfo,
  ) => void,
  +onPressSeeMoreSidebars: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId: string,
|};
function ChatThreadListItem({
  data,
  onPressItem,
  onPressSeeMoreSidebars,
  onSwipeableWillOpen,
  currentlyOpenedSwipeableId,
}: Props) {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const lastMessage = React.useMemo(() => {
    const mostRecentMessageInfo = data.mostRecentMessageInfo;
    if (!mostRecentMessageInfo) {
      return (
        <Text style={styles.noMessages} numberOfLines={1}>
          No messages
        </Text>
      );
    }
    return (
      <MessagePreview
        messageInfo={mostRecentMessageInfo}
        threadInfo={data.threadInfo}
      />
    );
  }, [data.mostRecentMessageInfo, data.threadInfo, styles]);

  const sidebars = data.sidebars.map((sidebarItem) => {
    if (sidebarItem.type === 'sidebar') {
      const { type, ...sidebarInfo } = sidebarItem;
      return (
        <ChatThreadListSidebar
          sidebarInfo={sidebarInfo}
          onPressItem={onPressItem}
          onSwipeableWillOpen={onSwipeableWillOpen}
          currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
          key={sidebarItem.threadInfo.id}
        />
      );
    } else {
      return (
        <ChatThreadListSeeMoreSidebars
          threadInfo={data.threadInfo}
          unread={sidebarItem.unread}
          showingSidebarsInline={sidebarItem.showingSidebarsInline}
          onPress={onPressSeeMoreSidebars}
          key="seeMore"
        />
      );
    }
  });

  const onPress = React.useCallback(() => {
    onPressItem(data.threadInfo, data.pendingPersonalThreadUserInfo);
  }, [onPressItem, data.threadInfo, data.pendingPersonalThreadUserInfo]);

  const lastActivity = shortAbsoluteDate(data.lastUpdatedTime);
  const unreadStyle = data.threadInfo.currentUser.unread ? styles.unread : null;

  const ancestorLabel = React.useMemo(() => {
    if (!data.threadInfo.parentThreadID) {
      return undefined;
    }
    return <ThreadAncestorsLabel threadInfo={data.threadInfo} />;
  }, [data.threadInfo]);

  const unreadDotStyle = React.useMemo(() => {
    return [
      styles.colorSplotch,
      { opacity: data.threadInfo.currentUser.unread ? 1 : 0 },
    ];
  }, [data.threadInfo.currentUser.unread, styles.colorSplotch]);

  return (
    <>
      <SwipeableThread
        threadInfo={data.threadInfo}
        mostRecentNonLocalMessage={data.mostRecentNonLocalMessage}
        onSwipeableWillOpen={onSwipeableWillOpen}
        currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
        iconSize={24}
      >
        <Button
          onPress={onPress}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
          iosActiveOpacity={0.85}
          style={styles.row}
        >
          <View style={unreadDotStyle}>
            <ColorSplotch
              color={`${colors.listForegroundSecondaryLabel.slice(1)}`}
              size="micro"
            />
          </View>
          <View style={styles.colorSplotch}>
            <ColorSplotch color={data.threadInfo.color} size="profile" />
          </View>
          <View style={styles.container}>
            {ancestorLabel}
            <View style={styles.row}>
              <SingleLine style={[styles.threadName, unreadStyle]}>
                {data.threadInfo.uiName}
              </SingleLine>
            </View>
            <View style={styles.row}>
              {lastMessage}
              <Text style={[styles.lastActivity, unreadStyle]}>
                {lastActivity}
              </Text>
            </View>
          </View>
        </Button>
      </SwipeableThread>
      {sidebars}
    </>
  );
}

const chatThreadListItemHeight = 80;
const unboundStyles = {
  colorSplotch: {
    marginLeft: 6,
  },
  container: {
    height: chatThreadListItemHeight,
    paddingLeft: 12,
    paddingRight: 18,
    justifyContent: 'center',
    flex: 1,
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 14,
    marginLeft: 10,
  },
  noMessages: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'listBackground',
  },
  threadName: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 18,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
};

export { ChatThreadListItem, chatThreadListItemHeight };
