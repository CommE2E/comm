// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type ConnectionInfo,
  updateConnectionStatusActionType,
} from '../types/socket-types';

export default function reduceConnectionInfo(
  state: ConnectionInfo,
  action: BaseAction,
): ConnectionInfo {
  if (action.type === updateConnectionStatusActionType) {
    return { ...state, status: action.payload.status };
  }
  return state;
}
