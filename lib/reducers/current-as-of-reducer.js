// @flow

import type { BaseAction } from '../types/redux-types';

function reduceCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    return action.payload.messagesResult.serverTime;
  }
  return currentAsOf;
}

export default reduceCurrentAsOf;
