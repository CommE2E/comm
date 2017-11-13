// @flow

import type { BaseAction } from '../types/redux-types';

const saveDraftActionType = "SAVE_DRAFT";

function reduceDrafts(
  state: ?{[key: string]: string},
  action: BaseAction,
): {[key: string]: string} {
  if (!state) {
    state = {};
  }
  if (action.type === saveDraftActionType) {
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
