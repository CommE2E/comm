// @flow

import { setCustomServerActionType } from '../actions/custom-server-actions.js';
import type { BaseAction } from '../types/redux-types';

export default function reduceCustomServer(
  state: ?string,
  action: BaseAction,
): ?string {
  if (action.type === setCustomServerActionType) {
    return action.payload;
  }

  return state;
}
