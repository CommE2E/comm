// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  queueActivityUpdatesActionType,
  activityUpdateSuccessActionType,
  activityUpdateFailedActionType,
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import { defaultCalendarQuery } from '../types/entry-types';

import { setNewSessionActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import { updateCalendarQueryActionTypes } from '../actions/entry-actions';
import { getConfig } from '../utils/config';

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
  } else if (
    action.type === activityUpdateSuccessActionType ||
    action.type === activityUpdateFailedActionType
  ) {
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
    return {
      ...state,
      queuedActivityUpdates: [],
      actualizedCalendarQuery: defaultCalendarQuery(
        getConfig().platformDetails.platform,
      ),
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === resetPasswordActionTypes.success
  ) {
    return {
      ...state,
      actualizedCalendarQuery: action.payload.calendarResult.calendarQuery,
    };
  } else if (
    action.type === registerActionTypes.success ||
    action.type === updateCalendarQueryActionTypes.success ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType
  ) {
    return {
      ...state,
      actualizedCalendarQuery: action.payload.calendarQuery,
    };
  }
  return state;
}
