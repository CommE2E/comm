// @flow

import { unsupervisedBackgroundActionType } from './lifecycle-state-reducer.js';
import { updateActivityActionTypes } from '../actions/activity-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import { queueActivityUpdatesActionType } from '../types/activity-types.js';
import { type BaseAction, rehydrateActionType } from '../types/redux-types.js';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  setLateResponseActionType,
  updateDisconnectedBarActionType,
} from '../types/socket-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (action.type === updateConnectionStatusActionType) {
    return { ...state, status: action.payload.status, lateResponses: [] };
  } else if (action.type === unsupervisedBackgroundActionType) {
    return { ...state, status: 'disconnected', lateResponses: [] };
  } else if (action.type === queueActivityUpdatesActionType) {
    const { activityUpdates } = action.payload;
    return {
      ...state,
      queuedActivityUpdates: [
        ...state.queuedActivityUpdates.filter(existingUpdate => {
          for (const activityUpdate of activityUpdates) {
            if (
              ((existingUpdate.focus && activityUpdate.focus) ||
                (existingUpdate.focus === false &&
                  activityUpdate.focus !== undefined)) &&
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
  } else if (action.type === updateActivityActionTypes.success) {
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
    };
  } else if (action.type === rehydrateActionType) {
    if (!action.payload || !action.payload.connection) {
      return state;
    }
    return {
      ...action.payload.connection,
      status: 'connecting',
      queuedActivityUpdates: [],
      lateResponses: [],
      showDisconnectedBar: false,
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
  } else if (action.type === updateDisconnectedBarActionType) {
    return { ...state, showDisconnectedBar: action.payload.visible };
  }
  return state;
}
