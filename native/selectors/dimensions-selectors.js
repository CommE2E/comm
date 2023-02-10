// @flow

import { createSelector } from 'reselect';

import { type DimensionsInfo } from '../redux/dimensions-updater.react.js';
import type { AppState } from '../redux/state-types.js';

export type DerivedDimensionsInfo = {
  ...DimensionsInfo,
  +safeAreaHeight: number,
};

const derivedDimensionsInfoSelector: (
  state: AppState,
) => DerivedDimensionsInfo = createSelector(
  (state: AppState) => state.dimensions,
  (dimensionsInfo: DimensionsInfo) => ({
    ...dimensionsInfo,
    safeAreaHeight:
      dimensionsInfo.height -
      dimensionsInfo.topInset -
      dimensionsInfo.bottomInset,
  }),
);

export { derivedDimensionsInfoSelector };
