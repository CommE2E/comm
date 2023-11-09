// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import { type BaseAction } from '../types/redux-types.js';
import {
  type ConnectionInfo,
  setLateResponseActionType,
  updateDisconnectedBarActionType,
} from '../types/socket-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {
      ...state,
      queuedActivityUpdates: [],
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
