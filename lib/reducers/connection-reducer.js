// @flow

import {
  type BaseAction,
  rehydrateActionType,
} from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  setLateResponseActionType,
} from '../types/socket-types';
import { defaultCalendarQuery } from '../types/entry-types';
import { queueActivityUpdatesActionType } from '../types/activity-types';

import { setNewSessionActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import { updateCalendarQueryActionTypes } from '../actions/entry-actions';
import { updateActivityActionTypes } from '../actions/activity-actions';
import { getConfig } from '../utils/config';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (action.type === updateConnectionStatusActionType) {
    return { ...state, status: action.payload.status, lateResponses: [] };
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
    action.type === updateActivityActionTypes.success ||
    action.type === updateActivityActionTypes.failed
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
  } else if (action.type === rehydrateActionType) {
    if (!action.payload || !action.payload.connection) {
      return state;
    }
    return {
      ...action.payload.connection,
      status: "connecting",
      lateResponses: [],
    };
  } else if (action.type === setLateResponseActionType) {
    const { messageID, isLate } = action.payload;
    const lateResponsesSet = new Set(state.lateResponses);
    if (isLate) {
      lateResponsesSet.add(messageID);
    } else {
      lateResponsesSet.delete(messageID);
    }
    return { ...state, lateResponses: [...lateResponsesSet] };
  }
  return state;
}
