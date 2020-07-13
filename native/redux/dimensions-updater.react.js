// @flow

import type { Dimensions } from 'lib/types/media-types';

import * as React from 'react';
import { Dimensions as NativeDimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import { updateDimensionsActiveType } from './action-types';

export default function DimensionsUpdater() {
  const dimensions = useSelector(state => state.dimensions);
  const dispatch = useDispatch();

  const onDimensionsChange = React.useCallback(
    (allDimensions: { window: Dimensions }) => {
      const { height: newHeight, width: newWidth } = allDimensions.window;
      const { height: oldHeight, width: oldWidth } = dimensions;
      if (newHeight !== oldHeight || newWidth !== oldWidth) {
        dispatch({
          type: updateDimensionsActiveType,
          payload: {
            height: newHeight,
            width: newWidth,
          },
        });
      }
    },
    [dimensions, dispatch],
  );

  React.useEffect(() => {
    NativeDimensions.addEventListener('change', onDimensionsChange);
    return () => {
      NativeDimensions.removeEventListener('change', onDimensionsChange);
    };
  }, [onDimensionsChange]);

  const prevDimensionsRef = React.useRef();
  React.useEffect(() => {
    const prevDimensions = prevDimensionsRef.current;
    if (
      prevDimensions &&
      (dimensions.height !== prevDimensions.height ||
        dimensions.width !== prevDimensions.width)
    ) {
      // Most of the time, this is triggered as a result of an action dispatched
      // by the handler attached above, so the onDimensionsChange call should be
      // a no-op. This conditional is here to correct Redux state when it is
      // imported from another device context.
      onDimensionsChange({ window: NativeDimensions.get('window') });
    }
    prevDimensionsRef.current = dimensions;
  }, [dimensions, onDimensionsChange]);

  return null;
}
