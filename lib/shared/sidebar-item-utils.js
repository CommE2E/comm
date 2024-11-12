// @flow

import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import {
  maxReadSidebars,
  maxUnreadSidebars,
  type SidebarInfo,
} from '../types/thread-types.js';
import { threeDays } from '../utils/date-utils.js';

export type SidebarThreadItem = {
  +type: 'sidebar',
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +lastUpdatedTime: number,
};
export type SidebarItem =
  | SidebarThreadItem
  | {
      +type: 'seeMore',
      +unread: boolean,
    }
  | { +type: 'spacer' };

function getSidebarItems(
  allSidebarItems: $ReadOnlyArray<SidebarThreadItem>,
): SidebarItem[] {
  const numUnreadSidebars = allSidebarItems.filter(
    sidebar => sidebar.threadInfo.currentUser.unread,
  ).length;
  let numReadSidebarsToShow = maxReadSidebars - numUnreadSidebars;
  const threeDaysAgo = Date.now() - threeDays;

  const sidebarItems: SidebarItem[] = [];
  for (const sidebar of allSidebarItems) {
    if (sidebarItems.length >= maxUnreadSidebars) {
      break;
    } else if (sidebar.threadInfo.currentUser.unread) {
      sidebarItems.push(sidebar);
    } else if (
      sidebar.lastUpdatedTime > threeDaysAgo &&
      numReadSidebarsToShow > 0
    ) {
      sidebarItems.push(sidebar);
      numReadSidebarsToShow--;
    }
  }

  const numReadButRecentSidebars = allSidebarItems.filter(
    sidebar =>
      !sidebar.threadInfo.currentUser.unread &&
      sidebar.lastUpdatedTime > threeDaysAgo,
  ).length;
  if (
    sidebarItems.length < numUnreadSidebars + numReadButRecentSidebars ||
    (sidebarItems.length < allSidebarItems.length && sidebarItems.length > 0)
  ) {
    sidebarItems.push({
      type: 'seeMore',
      unread: numUnreadSidebars > maxUnreadSidebars,
    });
  }
  if (sidebarItems.length !== 0) {
    sidebarItems.push({
      type: 'spacer',
    });
  }

  return sidebarItems;
}

function getAllInitialSidebarItems(
  sidebarInfos: $ReadOnlyArray<SidebarInfo>,
): SidebarThreadItem[] {
  return sidebarInfos.map(
    sidebarItem => {
      const {
        lastUpdatedTime,
        lastUpdatedAtLeastTime,
        ...rest
      } = sidebarItem;
      return {
        ...rest,
        type: 'sidebar',
        lastUpdatedTime: lastUpdatedAtLeastTime,
      };
    },
  );
}

async function getAllFinalSidebarItems(
  sidebarInfos: $ReadOnlyArray<SidebarInfo>,
): Promise<$ReadOnlyArray<SidebarThreadItem>> {
  const allSidebarItemPromises = sidebarInfos.map(
    async sidebarItem => {
      const {
        lastUpdatedTime,
        lastUpdatedAtLeastTime,
        ...rest
      } = sidebarItem;
      const finalLastUpdatedTime = await lastUpdatedTime;
      return {
        ...rest,
        type: 'sidebar',
        lastUpdatedTime: finalLastUpdatedTime,
      };
    },
  );
  return await Promise.all(allSidebarItemPromises);
}

export { getSidebarItems, getAllInitialSidebarItems, getAllFinalSidebarItems };
