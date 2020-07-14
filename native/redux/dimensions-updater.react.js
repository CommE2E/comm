// @flow

import type { Dimensions } from 'lib/types/media-types';

import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PropTypes from 'prop-types';

import { updateDimensionsActiveType } from './action-types';

export type DimensionsInfo = {|
  ...Dimensions,
  topInset: number,
  bottomInset: number,
  tabBarHeight: number,
|};

const dimensionsInfoPropType = PropTypes.exact({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  topInset: PropTypes.number.isRequired,
  bottomInset: PropTypes.number.isRequired,
  tabBarHeight: PropTypes.number.isRequired,
});

type Metrics = {|
  +frame: {| +x: number, +y: number, +width: number, +height: number |},
  +insets: {| +top: number, +left: number, +right: number, +bottom: number |},
|};
function dimensionsUpdateFromMetrics(metrics: Metrics): $Shape<DimensionsInfo> {
  return {
    height: metrics.frame.height,
    width: metrics.frame.width,
    topInset: metrics.insets.top,
    bottomInset: metrics.insets.bottom,
  };
}

const defaultDimensionsInfo = {
  ...dimensionsUpdateFromMetrics(initialWindowMetrics),
  tabBarHeight: 50,
};

function DimensionsUpdater() {
  const dimensions = useSelector(state => state.dimensions);
  const dispatch = useDispatch();

  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const updates = dimensionsUpdateFromMetrics({ frame, insets });
    for (let key in updates) {
      if (updates[key] === dimensions[key]) {
        continue;
      }
      dispatch({
        type: updateDimensionsActiveType,
        payload: updates,
      });
      return;
    }
  }, [dimensions, dispatch, frame, insets]);

  return null;
}

export { dimensionsInfoPropType, defaultDimensionsInfo, DimensionsUpdater };
