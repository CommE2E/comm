// @flow

import type { AppState } from '../redux-setup';
import type { Dimensions } from 'lib/types/media-types';

import { Platform, DeviceInfo } from 'react-native';

import { createSelector } from 'reselect';

const isIPhoneX = Platform.OS === "ios" && DeviceInfo.isIPhoneX_deprecated;

let statusBarHeight = 0;
if (Platform.OS === "android") {
  statusBarHeight = 24;
} else if (isIPhoneX) {
  statusBarHeight = 44;
} else if (Platform.OS === "ios") {
  statusBarHeight = 20;
}

// iOS starts the 0 pixel above the status bar,
// so we offset our content by the status bar height
const contentVerticalOffset = Platform.OS === "ios"
  ? statusBarHeight
  : 0;
const contentBottomOffset = isIPhoneX
  ? 34 // iPhone X home pill
  : 0;

const dimensionsSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.dimensions,
  (dimensions: Dimensions): Dimensions => {
    let { height, width } = dimensions;
    height -= contentBottomOffset;
    if (Platform.OS === "android") {
      // Android starts the 0 pixel below the status bar height,
      // but doesn't subtract it out of the dimensions
      height -= statusBarHeight;
    }
    return { height, width };
  },
);

const tabBarSize = Platform.OS === "android" ? 50 : 49;

export {
  contentVerticalOffset,
  contentBottomOffset,
  dimensionsSelector,
  tabBarSize,
};
