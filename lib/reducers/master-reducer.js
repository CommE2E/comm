// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

import { reduceLoadingStatuses } from './loading-reducer';
import reduceEntryInfos from './entry-reducer';

export default function baseReducer<T: BaseAppState>(
  state: T,
  action: BaseAction<T>,
): T {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  return {
    ...state,
    entryInfos: reduceEntryInfos(state.entryInfos, action),
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
  };
}
