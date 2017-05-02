// @flow

import type { BaseAction } from '../types/redux-types';

import { newSessionID } from '../selectors/session-selectors';

export default function reduceSessionID(
  state: string,
  lastUserInteractionSessionReset: number,
  action: BaseAction,
) {
  if (
    (
      action.type === "PING_STARTED" ||
      action.type === "SAVE_ENTRY_STARTED" ||
      action.type === "DELETE_ENTRY_STARTED" ||
      action.type === "RESTORE_ENTRY_STARTED"
    ) &&
    action.payload.newSessionID
  ) {
    return [action.payload.newSessionID, Date.now()];
  } else if (action.type === "SET_COOKIE") {
    return [newSessionID(), Date.now()];
  } else if (action.type === "NEW_SESSION_ID") {
    return [action.payload, Date.now()];
  }
  return [state, lastUserInteractionSessionReset];
}
