// @flow

import * as React from 'react';

import { values } from './objects.js';
import { threadInFilterList, threadIsChannel } from '../shared/thread-utils.js';
import type {
  MinimallyEncodedResolvedThreadInfo,
  RawThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { communitySubthreads } from '../types/thread-types-enum.js';
import type { LegacyThreadInfo } from '../types/thread-types.js';

type WritableCommunityDrawerItemData<T> = {
  threadInfo: ThreadInfo,
  itemChildren: $ReadOnlyArray<CommunityDrawerItemData<T>>,
  hasSubchannelsButton: boolean,
  labelStyle: T,
};
export type CommunityDrawerItemData<T> = $ReadOnly<
  WritableCommunityDrawerItemData<T>,
>;

function createRecursiveDrawerItemsData<LabelStyleType>(
  childThreadInfosMap: {
    +[id: string]: $ReadOnlyArray<ThreadInfo>,
  },
  communities: $ReadOnlyArray<MinimallyEncodedResolvedThreadInfo>,
  labelStyles: $ReadOnlyArray<LabelStyleType>,
  maxDepth: number,
): $ReadOnlyArray<CommunityDrawerItemData<LabelStyleType>> {
  const result: $ReadOnlyArray<
    WritableCommunityDrawerItemData<LabelStyleType>,
  > = communities.map(community => ({
    threadInfo: community,
    itemChildren: [],
    labelStyle: labelStyles[0],
    hasSubchannelsButton: false,
  }));
  let queue = result.map(item => [item, 0]);

  for (let i = 0; i < queue.length; i++) {
    const [item, lvl] = queue[i];
    const itemChildThreadInfos = childThreadInfosMap[item.threadInfo.id] ?? [];

    if (lvl < maxDepth) {
      item.itemChildren = itemChildThreadInfos
        .filter(childItem => communitySubthreads.includes(childItem.type))
        .map(childItem => ({
          threadInfo: childItem,
          itemChildren: [],
          labelStyle: labelStyles[Math.min(lvl + 1, labelStyles.length - 1)],
          hasSubchannelsButton:
            lvl + 1 === maxDepth &&
            threadHasSubchannels(childItem, childThreadInfosMap),
        }));
      queue = queue.concat(
        item.itemChildren.map(childItem => [childItem, lvl + 1]),
      );
    }
  }
  return result;
}

function threadHasSubchannels(
  threadInfo: ThreadInfo,
  childThreadInfosMap: {
    +[id: string]: $ReadOnlyArray<ThreadInfo>,
  },
): boolean {
  if (!childThreadInfosMap[threadInfo.id]?.length) {
    return false;
  }
  return childThreadInfosMap[threadInfo.id].some(thread =>
    threadIsChannel(thread),
  );
}

function useAppendCommunitySuffix(
  communities: $ReadOnlyArray<MinimallyEncodedResolvedThreadInfo>,
): $ReadOnlyArray<MinimallyEncodedResolvedThreadInfo> {
  return React.useMemo(() => {
    const result: MinimallyEncodedResolvedThreadInfo[] = [];
    const names = new Map<string, number>();

    for (const chat of communities) {
      let name = chat.uiName;
      const numberOfOccurrences = names.get(name);
      names.set(name, (numberOfOccurrences ?? 0) + 1);
      if (numberOfOccurrences) {
        name = `${name} (${numberOfOccurrences.toString()})`;
      }
      // Branching to appease `flow`.
      if (chat.minimallyEncoded) {
        result.push({ ...chat, uiName: name });
      } else {
        result.push({ ...chat, uiName: name });
      }
    }
    return result;
  }, [communities]);
}

function filterThreadIDsBelongingToCommunity(
  communityID: string,
  threadInfosObj: {
    +[id: string]: RawThreadInfo | LegacyThreadInfo | ThreadInfo,
  },
): $ReadOnlySet<string> {
  const threadInfos = values(threadInfosObj);
  const threadIDs = threadInfos
    .filter(
      thread =>
        (thread.community === communityID || thread.id === communityID) &&
        threadInFilterList(thread),
    )
    .map(item => item.id);
  return new Set(threadIDs);
}

export {
  createRecursiveDrawerItemsData,
  useAppendCommunitySuffix,
  filterThreadIDsBelongingToCommunity,
};
