// @flow

import * as React from 'react';

import type { MessageSourceMetadata } from '../types/db-ops-types.js';
import type { SuperAction } from '../types/redux-types.js';
import { useDispatch } from '../utils/redux-utils.js';

function useDispatchWithMessageSource(): (
  action: SuperAction,
  messageSourceMetadata: ?MessageSourceMetadata,
) => mixed {
  const dispatch = useDispatch();
  return React.useCallback(
    (action: SuperAction, messageSourceMetadata: ?MessageSourceMetadata) => {
      if (messageSourceMetadata) {
        dispatch({ ...action, messageSourceMetadata });
      } else {
        dispatch(action);
      }
    },
    [dispatch],
  );
}

export { useDispatchWithMessageSource };
