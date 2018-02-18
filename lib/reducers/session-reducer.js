// @flow

import type { BaseAction } from '../types/redux-types';

import { newSessionID } from '../selectors/session-selectors';
import { setCookieActionType } from '../utils/action-utils';
import {
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions';
import { pingActionTypes } from '../actions/ping-actions';

const newSessionIDActionType = "NEW_SESSION_ID";

function reduceSessionID(
  state: string,
  lastUserInteractionSessionReset: number,
  action: BaseAction,
) {
  if (
    (
      action.type === pingActionTypes.started ||
      action.type === createEntryActionTypes.started ||
      action.type === saveEntryActionTypes.started ||
      action.type === deleteEntryActionTypes.started ||
      action.type === restoreEntryActionTypes.started
    ) &&
    action.payload.newSessionID
  ) {
    return [action.payload.newSessionID, Date.now()];
  } else if (action.type === setCookieActionType) {
    return [newSessionID(), Date.now()];
  } else if (action.type === newSessionIDActionType) {
    return [action.payload, Date.now()];
  }
  return [state, lastUserInteractionSessionReset];
}

export {
  newSessionIDActionType,
  reduceSessionID,
};
