// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  queueActivityUpdateActionType,
  clearQueuedActivityUpdatesActionType,
} from '../types/socket-types';

import { setNewSessionActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (action.type === updateConnectionStatusActionType) {
    return { ...state, status: action.payload.status };
  } else if (action.type === queueActivityUpdateActionType) {
    const { activityUpdate } = action.payload;
    return {
      ...state,
      queuedActivityUpdates: [
        ...state.queuedActivityUpdates.filter(existingUpdate => {
            if (
              (existingUpdate.focus && activityUpdate.focus) ||
              existingUpdate.focus === false &&
                activityUpdate.focus !== undefined
            ) {
              return existingUpdate.threadID !== activityUpdate.threadID;
            }
            return true;
          },
        ),
        activityUpdate,
      ],
    };
  } else if (action.type === clearQueuedActivityUpdatesActionType) {
    const { payload } = action;
    return {
      ...state,
      queuedActivityUpdates: state.queuedActivityUpdates.filter(
        activityUpdate => !payload.activityUpdates.includes(activityUpdate),
      ),
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return { ...state, queuedActivityUpdates: [] };
  }
  return state;
}
