// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types.js';

import { SidebarItem, sidebarHeight } from './sidebar-item.react.js';
import SwipeableThread from './swipeable-thread.react.js';
import ExtendedArrow from '../components/arrow-extended.react.js';
import Arrow from '../components/arrow.react.js';
import Button from '../components/button.react.js';
import UnreadDot from '../components/unread-dot.react.js';
import { useColors, useStyles } from '../themes/colors.js';

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

  let arrow;
  if (extendArrow) {
    arrow = (
      <View style={styles.extendedArrow}>
        <ExtendedArrow />
      </View>
    );
  } else {
    arrow = (
      <View style={styles.arrow}>
        <Arrow />
      </View>
    );
  }

  const { threadInfo } = sidebarInfo;

  const onPress = React.useCallback(
    () => onPressItem(threadInfo),
    [threadInfo, onPressItem],
  );

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={styles.sidebar}
      onPress={onPress}
    >
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
          <SidebarItem sidebarInfo={sidebarInfo} />
        </SwipeableThread>
      </View>
    </Button>
  );
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
