// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './entry-info';

import _ from 'lodash';
import update from 'immutability-helper';

import { reduceLoadingStatuses } from '../utils/loading-utils';

export type BaseNavInfo = {
  home: bool,
  calendarID: ?string,
};

export type UserInfo = {
  username: string,
  email: string,
  emailVerified: bool,
};

export type LoadingStatus = "inactive" | "loading" | "error";

export type BaseAppState = {
  // This "+" means that navInfo can be a sub-type of BaseNavInfo. As a result,
  // within lib (where we're handling a generic BaseAppState) we can read
  // navInfo, but we can't set it - otherwise, we may be setting a more specific
  // type to a more general one. Normally Flow would enforce this rule, but
  // since we set our Redux state through updateStore/immutability-helper, Flow
  // is out the picture. We'll need to make sure of this ourselves.
  +navInfo: BaseNavInfo,
  userInfo: ?UserInfo,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
};

export type UpdateCallback<T: BaseAppState> = (prevState: T) => T;
export type UpdateStore<T: BaseAppState> = (update: UpdateCallback<T>) => void;

export type BaseAction<T: BaseAppState> =
  { type: "@@redux/INIT" } |
  { type: "GENERIC", callback: UpdateCallback<T> } | {
    type: "FETCH_MONTH_ENTRIES_STARTED",
    onlyLatestRequestMatters: bool,
    fetchIndex: number,
  } | {
    type: "FETCH_MONTH_ENTRIES_FAILED",
    error: true,
    fetchIndex: number,
  } | {
    type: "FETCH_MONTH_ENTRIES_SUCCESS",
    payload: EntryInfo[],
    fetchIndex: number,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_STARTED",
    onlyLatestRequestMatters: bool,
    fetchIndex: number,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_FAILED",
    error: true,
    fetchIndex: number,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_SUCCESS",
    payload: EntryInfo[],
    fetchIndex: number,
  };

type ThunkedAction<T: BaseAppState, A> = (dispatch: Dispatch<T, A>) => void;
type PromisedAction<T: BaseAppState, A> =
  (dispatch: Dispatch<T, A>) => Promise<void>;
export type Dispatch<T: BaseAppState, A> =
  ((action: A) => void) &
  ((action: BaseAction<T>) => void) &
  ((thunkedAction: ThunkedAction<T, A>) => void) &
  ((thunkedAction: ThunkedAction<T, BaseAction<T>>) => void) &
  ((promisedAction: PromisedAction<T, A>) => void) &
  ((promisedAction: PromisedAction<T, BaseAction<T>>) => void);

export function baseReducer<T: BaseAppState>(
  state: T, action: BaseAction<T>,
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

function reduceEntryInfos<T: BaseAppState>(
  state: {[day: string]: {[id: string]: EntryInfo}},
  action: BaseAction<T>,
) {
  if (
    action.type === "FETCH_MONTH_ENTRIES_SUCCESS" ||
      action.type === "FETCH_ALL_DAY_ENTRIES_SUCCESS"
  ) {
    const newEntries = _.chain(action.payload)
      .groupBy((entryInfo) => entryInfo.day)
      .mapValues(
        (entryInfoGroup, day) => _.chain(entryInfoGroup)
          .keyBy('id')
          .mapValues((result) => {
            // Try to preserve localIDs. This is because we use them as React
            // keys and we would prefer not to have to change those.
            const currentEntryInfo = state[day][result.id];
            if (currentEntryInfo && currentEntryInfo.localID) {
              result.localID = currentEntryInfo.localID;
            }
            return { $set: result };
          })
          .value(),
      ).value();
    return update(state, newEntries);
  }
  return state;
}
