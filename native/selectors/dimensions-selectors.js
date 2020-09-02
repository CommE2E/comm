// @flow

import type { AppState } from '../redux/redux-setup';
import {
  type DimensionsInfo,
  dimensionsInfoPropTypeShape,
} from '../redux/dimensions-updater.react';

import { createSelector } from 'reselect';
import PropTypes from 'prop-types';

export type DerivedDimensionsInfo = {|
  ...DimensionsInfo,
  +safeAreaHeight: number,
|};

const derivedDimensionsInfoPropType = PropTypes.exact({
  ...dimensionsInfoPropTypeShape,
  safeAreaHeight: PropTypes.number.isRequired,
});

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

export { derivedDimensionsInfoPropType, derivedDimensionsInfoSelector };
