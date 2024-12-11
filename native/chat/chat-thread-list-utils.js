// @flow

import _sum from 'lodash/fp/sum.js';
import { Platform } from 'react-native';

import {
  chatThreadListItemHeight,
  spacerHeight,
} from './chat-thread-list-item.react.js';
import type { Item } from './chat-thread-list.react.js';
import { sidebarHeight } from './sidebar-item.react.js';
import { listLoadingIndicatorHeight } from '../components/list-loading-indicator-utils.js';

function keyExtractor(item: Item): string {
  if (item.type === 'chatThreadItem') {
    return item.threadInfo.id;
  } else if (item.type === 'empty') {
    return 'empty';
  } else if (item.type === 'loader') {
    return 'loader';
  }
  return 'search';
}

function itemHeight(item: Item): number {
  if (item.type === 'loader') {
    return listLoadingIndicatorHeight;
  }

  if (item.type === 'search') {
    return Platform.OS === 'ios' ? 54.5 : 55;
  }

  // itemHeight for emptyItem might be wrong because of line wrapping
  // but we don't care because we'll only ever be rendering this item
  // by itself and it should always be on-screen
  if (item.type === 'empty') {
    return 123;
  }

  const baseHeight = chatThreadListItemHeight;
  const sidebarsHeight = item.sidebars.length * sidebarHeight;
  const spacerHeightAdjustment = item.sidebars.length > 0 ? spacerHeight : 0;

  return baseHeight + sidebarsHeight + spacerHeightAdjustment;
}

function heightOfItems(data: $ReadOnlyArray<Item>): number {
  return _sum(data.map(itemHeight));
}

function getItemLayout(
  data: ?$ReadOnlyArray<Item>,
  index: number,
): { length: number, offset: number, index: number } {
  if (!data) {
    return { length: 0, offset: 0, index };
  }
  const offset = heightOfItems(data.filter((_, i): boolean => i < index));
  const item = data[index];
  const length = item ? itemHeight(item) : 0;
  return { length, offset, index };
}

export { keyExtractor, itemHeight, heightOfItems, getItemLayout };
