// @flow

import * as React from 'react';

import type { MessageData } from '../types/db-ops-types.js';
import type { SuperAction } from '../types/redux-types.js';
import { useDispatch } from '../utils/redux-utils.js';

function useDispatchWithMessageData(): (
  action: SuperAction,
  messageData: MessageData,
) => mixed {
  const dispatch = useDispatch();
  return React.useCallback(
    (action: SuperAction, messageData: MessageData) =>
      dispatch({ ...action, messageData }),
    [dispatch],
  );
}

export { useDispatchWithMessageData };
