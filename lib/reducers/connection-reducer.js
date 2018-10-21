// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
  queueActivityUpdateActionType,
  clearQueuedActivityUpdatesActionType,
} from '../types/socket-types';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (action.type === updateConnectionStatusActionType) {
    return { ...state, status: action.payload.status };
  } else if (action.type === queueActivityUpdateActionType) {
    return {
      ...state,
      queuedActivityUpdates: [
        ...state.queuedActivityUpdates,
        action.payload.activityUpdate,
      ],
    };
  } else if (action.type === clearQueuedActivityUpdatesActionType) {
    return { ...state, queuedActivityUpdates: [] };
  }
  return state;
}
