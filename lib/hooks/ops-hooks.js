// @flow

import * as React from 'react';

import type { MessageID } from '../types/db-ops-types.js';
import type { SuperAction } from '../types/redux-types.js';
import { useDispatch } from '../utils/redux-utils.js';

function useMessageDispatch(): (
  action: SuperAction,
  messageID: MessageID,
) => mixed {
  const dispatch = useDispatch();
  return React.useCallback(
    (action: SuperAction, messageID: MessageID) =>
      dispatch({ ...action, messageID }),
    [dispatch],
  );
}

export { useMessageDispatch };
