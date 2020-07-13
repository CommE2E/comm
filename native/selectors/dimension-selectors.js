// @flow

import type { AppState } from '../redux/redux-setup';
import type { Dimensions } from 'lib/types/media-types';
import type { DimensionsInfo } from '../redux/dimensions-updater.react';

import { Platform, DeviceInfo } from 'react-native';

import { createSelector } from 'reselect';

const isIPhoneX =
  Platform.OS === 'ios' && DeviceInfo.getConstants().isIPhoneX_deprecated;
const contentBottomOffset = isIPhoneX ? 34 : 0;

const androidOpaqueStatus = Platform.OS === 'android' && Platform.Version < 21;

const dimensionsSelector: (state: AppState) => Dimensions = createSelector(
  (state: AppState) => state.dimensions,
  (dimensions: DimensionsInfo): Dimensions => {
    const { width, bottomInset } = dimensions;
    const height = dimensions.height - bottomInset;
    return { height, width };
  },
);

function contentVerticalOffsetSelector(state: AppState) {
  return state.dimensions.topInset;
}

export {
  androidOpaqueStatus,
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
};
