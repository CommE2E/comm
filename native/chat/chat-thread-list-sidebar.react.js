// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import ArrowLong from '../components/arrow-long.react';
import Arrow from '../components/arrow.react';
import UnreadDot from '../components/unread-dot.react';
import { SidebarItem } from './sidebar-item.react';
import SwipeableThread from './swipeable-thread.react';

type Props = {
  +sidebarInfo: SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId: string,
  +extendArrow: boolean,
};
function ChatThreadListSidebar(props: Props): React.Node {
  const {
    sidebarInfo,
    onSwipeableWillOpen,
    currentlyOpenedSwipeableId,
    onPressItem,
    extendArrow = false,
  } = props;

  let arrow;
  if (extendArrow) {
    arrow = (
      <View style={styles.longArrow}>
        <ArrowLong />
      </View>
    );
  } else {
    arrow = (
      <View style={styles.arrow}>
        <Arrow />
      </View>
    );
  }

  return (
    <View style={styles.chatThreadListContainer}>
      {arrow}
      <View style={styles.unreadIndicatorContainer}>
        <UnreadDot unread={sidebarInfo.threadInfo.currentUser.unread} />
      </View>
      <View style={styles.swipeableThreadContainer}>
        <SwipeableThread
          threadInfo={sidebarInfo.threadInfo}
          mostRecentNonLocalMessage={sidebarInfo.mostRecentNonLocalMessage}
          onSwipeableWillOpen={onSwipeableWillOpen}
          currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
          iconSize={16}
        >
          <SidebarItem sidebarInfo={sidebarInfo} onPressItem={onPressItem} />
        </SwipeableThread>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arrow: {
    left: 27.5,
    position: 'absolute',
    top: -12,
  },
  chatThreadListContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  longArrow: {
    left: 28,
    position: 'absolute',
    top: -19,
  },
  swipeableThreadContainer: {
    flex: 1,
  },
  unreadIndicatorContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingLeft: 6,
    width: 56,
  },
});

export default ChatThreadListSidebar;
