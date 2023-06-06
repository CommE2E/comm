// @flow

import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';

import type { TextStyle } from '../types/styles.js';

export type CommunityDrawerItemDataFlattened = {
  +threadInfo: ThreadInfo,
  +hasSubchannelsButton: boolean,
  +labelStyle: TextStyle,
  +isCommunity: boolean,
  +hasChildren: boolean,
  +itemStyle: {
    +indentation: number,
    background: 'none' | 'beginning' | 'middle' | 'end',
  },
};

const defaultIndentation = 8;
const addedIndentation = 16;

function flattenDrawerItemsData(
  data: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
  expanded: $ReadOnlyArray<string>,
): $ReadOnlyArray<CommunityDrawerItemDataFlattened> {
  let results = [];

  for (const item of data) {
    const isOpen = expanded.includes(item.threadInfo.id);

    results.push({
      threadInfo: item.threadInfo,
      hasSubchannelsButton: item.hasSubchannelsButton,
      labelStyle: item.labelStyle,
      isCommunity: true,
      hasChildren: item.itemChildren?.length > 0,
      itemStyle: {
        indentation: defaultIndentation,
        background: isOpen ? 'beginning' : 'none',
      },
    });

    if (!isOpen) {
      continue;
    }
    results = results.concat(
      flattenDrawerItemsDataRecurrent(
        item.itemChildren,
        defaultIndentation,
        expanded,
      ),
    );
    results[results.length - 1].itemStyle.background = 'end';
  }

  return results;
}

function flattenDrawerItemsDataRecurrent(
  data: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
  prevIndentation: number,
  expanded: $ReadOnlyArray<string>,
): $ReadOnlyArray<CommunityDrawerItemDataFlattened> {
  let results = [];

  const indentation = prevIndentation + addedIndentation;

  for (const item of data) {
    results.push({
      threadInfo: item.threadInfo,
      hasSubchannelsButton: item.hasSubchannelsButton,
      labelStyle: item.labelStyle,
      isCommunity: false,
      hasChildren: item.itemChildren?.length > 0,
      itemStyle: {
        indentation: indentation,
        background: 'middle',
      },
    });

    if (!expanded.includes(item.threadInfo.id)) {
      continue;
    }

    results = results.concat(
      flattenDrawerItemsDataRecurrent(item.itemChildren, indentation, expanded),
    );
  }

  return results;
}

function findAllDescendantIDs(
  data: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
): $ReadOnlyArray<string> {
  const results = [];
  for (const item of data) {
    results.push(item.threadInfo.id);
    results.concat(findAllDescendantIDs(item.itemChildren));
  }
  return results;
}

function findThreadChildrenItems(
  data: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
  id: string,
): ?$ReadOnlyArray<CommunityDrawerItemData<TextStyle>> {
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

function filterThreadAndDescendantIDs(
  ids: $ReadOnlyArray<string>,
  allItems: $ReadOnlyArray<CommunityDrawerItemData<TextStyle>>,
  id: string,
): $ReadOnlyArray<string> {
  const childItems = findThreadChildrenItems(allItems, id);
  if (!childItems) {
    return [];
  }
  const descendants = findAllDescendantIDs(childItems);
  return ids.filter(item => !descendants.includes(item) && !(item === id));
}

export { flattenDrawerItemsData, filterThreadAndDescendantIDs };
