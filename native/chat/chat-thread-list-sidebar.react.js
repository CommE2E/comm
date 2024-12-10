// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { SidebarInfo } from 'lib/types/thread-types.js';

import { sidebarHeight, SidebarItem } from './sidebar-item.react.js';
import SwipeableThread from './swipeable-thread.react.js';
import Button from '../components/button.react.js';
import UnreadDot from '../components/unread-dot.react.js';
import { useColors, useStyles } from '../themes/colors.js';
import ExtendedArrow from '../vectors/arrow-extended.react.js';
import Arrow from '../vectors/arrow.react.js';

type Props = {
  +sidebarInfo: SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId: string,
  +extendArrow: boolean,
};
function ChatThreadListSidebar(props: Props): React.Node {
  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const {
    sidebarInfo,
    onSwipeableWillOpen,
    currentlyOpenedSwipeableId,
    onPressItem,
    extendArrow = false,
  } = props;

  const { threadInfo } = sidebarInfo;

  const onPress = React.useCallback(
    () => onPressItem(threadInfo),
    [threadInfo, onPressItem],
  );

  const arrow = React.useMemo(() => {
    if (extendArrow) {
      return (
        <View style={styles.extendedArrow}>
          <ExtendedArrow />
        </View>
      );
    }
    return (
      <View style={styles.arrow}>
        <Arrow />
      </View>
    );
  }, [extendArrow, styles.arrow, styles.extendedArrow]);

  const unreadIndicator = React.useMemo(
    () => (
      <View style={styles.unreadIndicatorContainer}>
        <UnreadDot unread={sidebarInfo.threadInfo.currentUser.unread} />
      </View>
    ),
    [
      sidebarInfo.threadInfo.currentUser.unread,
      styles.unreadIndicatorContainer,
    ],
  );

  const sidebarItem = React.useMemo(
    () => <SidebarItem sidebarInfo={sidebarInfo} />,
    [sidebarInfo],
  );

  const swipeableThread = React.useMemo(
    () => (
      <View style={styles.swipeableThreadContainer}>
        <SwipeableThread
          threadInfo={sidebarInfo.threadInfo}
          mostRecentNonLocalMessage={sidebarInfo.mostRecentNonLocalMessage}
          onSwipeableWillOpen={onSwipeableWillOpen}
          currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
          iconSize={16}
        >
          {sidebarItem}
        </SwipeableThread>
      </View>
    ),
    [
      currentlyOpenedSwipeableId,
      onSwipeableWillOpen,
      sidebarInfo.mostRecentNonLocalMessage,
      sidebarInfo.threadInfo,
      sidebarItem,
      styles.swipeableThreadContainer,
    ],
  );

  const chatThreadListSidebar = React.useMemo(
    () => (
      <Button
        iosFormat="highlight"
        iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
        iosActiveOpacity={0.85}
        style={styles.sidebar}
        onPress={onPress}
      >
        {arrow}
        {unreadIndicator}
        {swipeableThread}
      </Button>
    ),
    [
      arrow,
      colors.listIosHighlightUnderlay,
      onPress,
      styles.sidebar,
      swipeableThread,
      unreadIndicator,
    ],
  );

  return chatThreadListSidebar;
}

const unboundStyles = {
  arrow: {
    left: 28,
    position: 'absolute',
    top: -12,
  },
  extendedArrow: {
    left: 28,
    position: 'absolute',
    top: -6,
  },
  sidebar: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    height: sidebarHeight,
    paddingLeft: 6,
    paddingRight: 18,
    backgroundColor: 'listBackground',
  },
  swipeableThreadContainer: {
    flex: 1,
    height: '100%',
  },
  unreadIndicatorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: 6,
    width: 56,
  },
};

export default ChatThreadListSidebar;
