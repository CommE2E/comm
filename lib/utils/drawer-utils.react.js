// @flow

import { threadIsChannel } from '../shared/thread-utils.js';
import {
  type ThreadInfo,
  type ResolvedThreadInfo,
  communitySubthreads,
} from '../types/thread-types.js';

export type CommunityDrawerItemData<T> = {
  +threadInfo: ThreadInfo,
  +itemChildren?: $ReadOnlyArray<CommunityDrawerItemData<T>>,
  +hasSubchannelsButton: boolean,
  +labelStyle: T,
};

function createRecursiveDrawerItemsData<LabelStyleType>(
  childThreadInfosMap: { +[id: string]: $ReadOnlyArray<ThreadInfo> },
  communities: $ReadOnlyArray<ResolvedThreadInfo>,
  labelStyles: $ReadOnlyArray<LabelStyleType>,
  maxDepth: number,
): $ReadOnlyArray<CommunityDrawerItemData<LabelStyleType>> {
  const result = communities.map(community => ({
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
  childThreadInfosMap: { +[id: string]: $ReadOnlyArray<ThreadInfo> },
): boolean {
  if (!childThreadInfosMap[threadInfo.id]?.length) {
    return false;
  }
  return childThreadInfosMap[threadInfo.id].some(thread =>
    threadIsChannel(thread),
  );
}

function appendSuffix(
  chats: $ReadOnlyArray<ResolvedThreadInfo>,
): ResolvedThreadInfo[] {
  const result = [];
  const names = new Map<string, number>();

  for (const chat of chats) {
    let name = chat.uiName;
    const numberOfOccurrences = names.get(name);
    names.set(name, (numberOfOccurrences ?? 0) + 1);
    if (numberOfOccurrences) {
      name = `${name} (${numberOfOccurrences.toString()})`;
    }
    result.push({ ...chat, uiName: name });
  }
  return result;
}

export { createRecursiveDrawerItemsData, appendSuffix };
