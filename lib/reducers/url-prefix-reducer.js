// @flow

import type { BaseAction } from '../types/redux-types.js';
import { setURLPrefix } from '../utils/url-utils.js';

export default function reduceURLPrefix(
  state: string,
  action: BaseAction,
): string {
  if (action.type === setURLPrefix) {
    return action.payload;
  }
  return state;
}
