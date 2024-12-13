// @flow

import _orderBy from 'lodash/fp/orderBy.js';

import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import {
  maxReadSidebars,
  maxUnreadSidebars,
  type SidebarInfo,
} from '../types/thread-types.js';
import ChatThreadItemLoaderCache from '../utils/chat-thread-item-loader-cache.js';
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

const sortFunc = _orderBy('lastUpdatedTime')('desc');

function getSidebarItems(
  allSidebarItems: $ReadOnlyArray<SidebarThreadItem>,
): SidebarItem[] {
  const sorted = sortFunc(allSidebarItems);

  const numUnreadSidebars = sorted.filter(
    sidebar => sidebar.threadInfo.currentUser.unread,
  ).length;
  let numReadSidebarsToShow = maxReadSidebars - numUnreadSidebars;
  const threeDaysAgo = Date.now() - threeDays;

  const sidebarItems: SidebarItem[] = [];
  for (const sidebar of sorted) {
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

  const numReadButRecentSidebars = sorted.filter(
    sidebar =>
      !sidebar.threadInfo.currentUser.unread &&
      sidebar.lastUpdatedTime > threeDaysAgo,
  ).length;
  if (
    sidebarItems.length < numUnreadSidebars + numReadButRecentSidebars ||
    (sidebarItems.length < sorted.length && sidebarItems.length > 0)
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
  return sidebarInfos.map(sidebarItem => {
    const {
      lastUpdatedTime,
      lastUpdatedAtLeastTime,
      lastUpdatedAtMostTime,
      ...rest
    } = sidebarItem;
    return {
      ...rest,
      type: 'sidebar',
      lastUpdatedTime: lastUpdatedAtLeastTime,
    };
  });
}

async function getAllFinalSidebarItems(
  sidebarInfos: $ReadOnlyArray<SidebarInfo>,
): Promise<$ReadOnlyArray<SidebarThreadItem>> {
  const allSidebarItemPromises = sidebarInfos.map(async sidebarItem => {
    const {
      lastUpdatedTime,
      lastUpdatedAtLeastTime,
      lastUpdatedAtMostTime,
      ...rest
    } = sidebarItem;
    const finalLastUpdatedTime = await lastUpdatedTime();
    return {
      ...rest,
      type: 'sidebar',
      lastUpdatedTime: finalLastUpdatedTime,
    };
  });
  return await Promise.all(allSidebarItemPromises);
}

type SidebarItemForCache = {
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +lastUpdatedTimeIncludingSidebars: number,
};

// This async function returns a set of candidates that can be passed to
// getSidebarItems. It avoids passing all of the sidebarInfos so that we don't
// need to `await lastUpdatedTime()` for all of them, which we've found can be
// expensive on Hermes. Instead, we use ChatThreadItemLoaderCache to only
// consider the top N candidates, such that passing the results to
// getSidebarItems would yield the same set as if we had processed every single
// sidebar.
async function getCandidateSidebarItemsForThreadList(
  sidebarInfos: $ReadOnlyArray<SidebarInfo>,
): Promise<$ReadOnlyArray<SidebarThreadItem>> {
  const loaders = sidebarInfos.map(sidebar => ({
    threadInfo: sidebar.threadInfo,
    lastUpdatedAtLeastTimeIncludingSidebars: sidebar.lastUpdatedAtLeastTime,
    lastUpdatedAtMostTimeIncludingSidebars: sidebar.lastUpdatedAtMostTime,
    initialChatThreadItem: {
      threadInfo: sidebar.threadInfo,
      mostRecentNonLocalMessage: sidebar.mostRecentNonLocalMessage,
      lastUpdatedTimeIncludingSidebars: sidebar.lastUpdatedAtLeastTime,
    },
    getFinalChatThreadItem: async () => {
      const lastUpdatedTime = await sidebar.lastUpdatedTime();
      return {
        threadInfo: sidebar.threadInfo,
        mostRecentNonLocalMessage: sidebar.mostRecentNonLocalMessage,
        lastUpdatedTimeIncludingSidebars: lastUpdatedTime,
      };
    },
  }));

  // We want the top maxReadSidebars threads (either read or unread),
  // and the top maxUnreadSidebars unread threads
  const generalCache = new ChatThreadItemLoaderCache<SidebarItemForCache>(
    loaders,
  );
  const unreadCache = new ChatThreadItemLoaderCache<SidebarItemForCache>(
    loaders.filter(loader => loader.threadInfo.currentUser.unread),
  );

  const topGeneralPromise =
    generalCache.loadMostRecentChatThreadItems(maxReadSidebars);
  const topUnreadPromise =
    unreadCache.loadMostRecentChatThreadItems(maxUnreadSidebars);
  const [topGeneralResults, topUnreadResults] = await Promise.all([
    topGeneralPromise,
    topUnreadPromise,
  ]);

  const topResults = topUnreadResults.slice(0, maxUnreadSidebars);
  const topThreadIDs = new Set([
    ...topResults.map(result => result.threadInfo.id),
  ]);
  const generalResults = topGeneralResults.slice(0, maxReadSidebars);
  for (const result of generalResults) {
    if (!topThreadIDs.has(result.threadInfo.id)) {
      topResults.push(result);
    }
  }

  return topResults.map(result => {
    const {
      threadInfo,
      mostRecentNonLocalMessage,
      lastUpdatedTimeIncludingSidebars,
    } = result;
    return {
      type: 'sidebar',
      threadInfo,
      lastUpdatedTime: lastUpdatedTimeIncludingSidebars,
      mostRecentNonLocalMessage,
    };
  });
}

export {
  getSidebarItems,
  getAllInitialSidebarItems,
  getAllFinalSidebarItems,
  getCandidateSidebarItemsForThreadList,
};
