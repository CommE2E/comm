// @flow

import type { BaseAction } from '../types/redux-types';

import { setCookieActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions';

function newSessionID(): string {
  return Math.floor(0x80000000 * Math.random()).toString(36);
}

function reduceSessionID(state: string, action: BaseAction) {
  if (
    action.type === setCookieActionType ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return newSessionID();
  }
  return state;
}

export {
  newSessionID,
  reduceSessionID,
};
