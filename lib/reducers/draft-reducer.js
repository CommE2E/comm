// @flow

import type { BaseAction } from '../types/redux-types';

function reduceDrafts(
  state: ?{[key: string]: string},
  action: BaseAction,
): {[key: string]: string} {
  if (!state) {
    state = {};
  }
  return state;
}

export default reduceDrafts;
