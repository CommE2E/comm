// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  queueActivityUpdatesActionType,
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
  } else if (action.type === queueActivityUpdatesActionType) {
    const { activityUpdates } = action.payload;
    return {
      ...state,
      queuedActivityUpdates: [
        ...state.queuedActivityUpdates.filter(existingUpdate => {
          for (let activityUpdate of activityUpdates) {
            if (
              (
                (existingUpdate.focus && activityUpdate.focus) ||
                (existingUpdate.focus === false &&
                  activityUpdate.focus !== undefined)
              ) &&
              existingUpdate.threadID === activityUpdate.threadID
            ) {
              return false;
            }
          }
          return true;
        }),
        ...activityUpdates,
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
