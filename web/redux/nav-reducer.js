// @flow

import type { Action } from '../redux/redux-setup';
import { type NavInfo, updateNavInfoActionType } from '../types/nav-types';

export default function reduceNavInfo(state: NavInfo, action: Action): NavInfo {
  if (action.type === updateNavInfoActionType) {
    return {
      ...state,
      ...action.payload,
    };
  }
  return state;
}
