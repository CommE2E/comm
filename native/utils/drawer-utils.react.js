// @flow

import { threadTypeIsCommunityRoot } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';

import type { TextStyle } from '../types/styles.js';

export type CommunityDrawerItemDataFlattened = {
  +threadInfo: ThreadInfo,
  +hasSubchannelsButton: boolean,
  +labelStyle: TextStyle,
  +hasChildren: boolean,
  +itemStyle: {
    +indentation: number,
    +background: 'none' | 'beginning' | 'middle' | 'end',
  },
};

const defaultIndentation = 8;
const addedIndentation = 16;

function flattenDrawerItemsData(
  data: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
  expanded: $ReadOnlyArray<string>,
  prevIndentation: ?number,
): $ReadOnlyArray<CommunityDrawerItemDataFlattened> {
  let results: Array<CommunityDrawerItemDataFlattened> = [];

  for (const item of data) {
    const isOpen = expanded.includes(item.threadInfo.id);
    const isCommunity = threadTypeIsCommunityRoot(item.threadInfo.type);

    let background = 'middle';
    if (isCommunity) {
      background = isOpen ? 'beginning' : 'none';
    }

    let indentation = defaultIndentation;
    if (!isCommunity && prevIndentation) {
      indentation = prevIndentation + addedIndentation;
    }

    results.push({
      threadInfo: item.threadInfo,
      hasSubchannelsButton: item.hasSubchannelsButton,
      labelStyle: item.labelStyle,
      hasChildren: item.itemChildren?.length > 0,
      itemStyle: {
        indentation,
        background,
      },
    });

    if (!isOpen) {
      continue;
    }
    results = results.concat(
      flattenDrawerItemsData(item.itemChildren, expanded, indentation),
    );
    if (isCommunity) {
      results[results.length - 1] = {
        ...results[results.length - 1],
        itemStyle: {
          ...results[results.length - 1].itemStyle,
          background: 'end',
        },
      };
    }
  }

  return results;
}

function findAllDescendantIDs<T>(
  data: $ReadOnlyArray<CommunityDrawerItemData<T>>,
): $ReadOnlyArray<string> {
  const results = [];
  for (const item of data) {
    results.push(item.threadInfo.id);
    results.concat(findAllDescendantIDs(item.itemChildren));
  }
  return results;
}

function findThreadChildrenItems<T>(
  data: $ReadOnlyArray<CommunityDrawerItemData<T>>,
  id: string,
): ?$ReadOnlyArray<CommunityDrawerItemData<T>> {
  for (const item of data) {
    if (item.threadInfo.id === id) {
      return item.itemChildren;
    }
    const result = findThreadChildrenItems(item.itemChildren, id);
    if (result) {
      return result;
    }
  }
  return undefined;
}

function filterOutThreadAndDescendantIDs<T>(
  idsToFilter: $ReadOnlyArray<string>,
  allItems: $ReadOnlyArray<CommunityDrawerItemData<T>>,
  threadID: string,
): $ReadOnlyArray<string> {
  const childItems = findThreadChildrenItems(allItems, threadID);
  if (!childItems) {
    return [];
  }
  const descendants = findAllDescendantIDs(childItems);
  const descendantsSet = new Set(descendants);
  return idsToFilter.filter(
    item => !descendantsSet.has(item) && item !== threadID,
  );
}

export { flattenDrawerItemsData, filterOutThreadAndDescendantIDs };
