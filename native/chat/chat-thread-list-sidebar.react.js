// @flow

import * as React from 'react';

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import SidebarItem from './sidebar-item.react';
import SwipeableThread from './swipeable-thread.react';

type Props = {|
  +sidebarInfo: SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId: string,
|};
function ChatThreadListSidebar(props: Props) {
  const {
    sidebarInfo,
    onSwipeableWillOpen,
    currentlyOpenedSwipeableId,
    onPressItem,
  } = props;
  return (
    <SwipeableThread
      threadInfo={sidebarInfo.threadInfo}
      mostRecentNonLocalMessage={sidebarInfo.mostRecentNonLocalMessage}
      onSwipeableWillOpen={onSwipeableWillOpen}
      currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
      iconSize={16}
    >
      <SidebarItem
        sidebarInfo={sidebarInfo}
        onPressItem={onPressItem}
        unreadIndicator={true}
      />
    </SwipeableThread>
  );
}

export default ChatThreadListSidebar;
