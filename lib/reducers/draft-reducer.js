// @flow

import type { BaseAction } from '../types/redux-types';

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions';
import { setCookieActionType } from '../utils/action-utils';

const saveDraftActionType = "SAVE_DRAFT";

function reduceDrafts(
  state: ?{[key: string]: string},
  action: BaseAction,
): {[key: string]: string} {
  if (!state) {
    state = {};
  }
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setCookieActionType &&
      action.payload.cookieInvalidated)
  ) {
    return {};
  } else if (action.type === saveDraftActionType) {
    return {
      ...state,
      [action.payload.key]: action.payload.draft,
    };
  }
  return state;
}

export {
  saveDraftActionType,
  reduceDrafts,
};
