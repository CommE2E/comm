// @flow

import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
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
  let results = [];

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

export { flattenDrawerItemsData };
