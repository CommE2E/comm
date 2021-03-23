// @flow

import type { BaseAction } from '../types/redux-types';
import { setURLPrefix } from '../utils/url-utils';

export default function reduceURLPrefix(state: string, action: BaseAction): string {
  if (action.type === setURLPrefix) {
    return action.payload;
  }
  return state;
}
