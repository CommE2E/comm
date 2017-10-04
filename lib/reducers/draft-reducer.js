// @flow

import type { BaseAction } from '../types/redux-types';

function reduceDrafts(
  state: ?{[key: string]: string},
  action: BaseAction,
): {[key: string]: string} {
  if (!state) {
    state = {};
  }
  if (action.type === "SAVE_DRAFT") {
    return {
      ...state,
      [action.payload.key]: action.payload.draft,
    };
  }
  return state;
}

export default reduceDrafts;
