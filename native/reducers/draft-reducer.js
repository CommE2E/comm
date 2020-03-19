// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import { saveDraftActionType } from 'lib/actions/miscellaneous-action-types';

export default function reduceDrafts(
  state: ?{ [key: string]: string },
  action: *,
): { [key: string]: string } {
  if (!state) {
    state = {};
  }
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
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
