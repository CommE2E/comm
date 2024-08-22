// @flow

import * as React from 'react';

import type { DispatchMetadata, SuperAction } from '../types/redux-types.js';
import { useDispatch } from '../utils/redux-utils.js';

function useDispatchWithMetadata(): (
  action: SuperAction,
  dispatchMetadata: ?DispatchMetadata,
) => mixed {
  const dispatch = useDispatch();
  return React.useCallback(
    (action: SuperAction, dispatchMetadata: ?DispatchMetadata) => {
      if (dispatchMetadata) {
        dispatch({ ...action, dispatchMetadata });
      } else {
        dispatch(action);
      }
    },
    [dispatch],
  );
}

export { useDispatchWithMetadata };
