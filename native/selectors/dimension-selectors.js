// @flow

import type { AppState } from '../redux/redux-setup';
import type { Dimensions } from 'lib/types/media-types';

import { Platform, DeviceInfo } from 'react-native';

import { createSelector } from 'reselect';

export type DimensionsInfo = {|
  ...Dimensions,
  tabBarHeight: number,
|};

const isIPhoneX = Platform.OS === 'ios' && DeviceInfo.getConstants().isIPhoneX_deprecated;

let statusBarHeight = 0;
if (Platform.OS === 'android') {
  statusBarHeight = 24;
} else if (isIPhoneX) {
  statusBarHeight = 44;
} else if (Platform.OS === 'ios') {
  statusBarHeight = 20;
}

// iPhone X home pill
const contentBottomOffset = isIPhoneX ? 34 : 0;

const dimensionsSelector: (state: AppState) => Dimensions = createSelector(
  (state: AppState) => state.dimensions,
  (dimensions: DimensionsInfo): Dimensions => {
    let { height, width } = dimensions;
    height -= contentBottomOffset;
    if (Platform.OS === 'android') {
      // Android starts the 0 pixel below the status bar height,
      // but doesn't subtract it out of the dimensions
      height -= statusBarHeight;
    }
    return { height, width };
  },
);

// iOS starts the 0 pixel above the status bar,
// so we offset our content by the status bar height
const contentVerticalOffsetSelector: (
  state: AppState,
) => number = createSelector(
  (state: AppState) => state.dimensions,
  (dimensions: DimensionsInfo): number => {
    if (Platform.OS !== 'ios') {
      return 0;
    }
    const { height, width } = dimensions;
    if (width > height) {
      // We don't display a status bar at all in landscape mode,
      // plus there is no notch for the iPhone X
      return 0;
    }
    return statusBarHeight;
  },
);

const defaultTabBarHeight = 50;

export {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
  defaultTabBarHeight,
};
