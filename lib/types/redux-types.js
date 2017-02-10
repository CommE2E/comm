// @flow

import type { CalendarInfo } from './calendar-types';
import type { EntryInfo } from './entry-types';
import type { LoadingStatus, LoadingInfo } from './loading-types';
import type { BaseNavInfo } from './nav-types';
import type { UserInfo } from './user-types';

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
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_MONTH_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_MONTH_ENTRIES_SUCCESS",
    payload: EntryInfo[],
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ALL_DAY_ENTRIES_SUCCESS",
    payload: EntryInfo[],
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_SUCCESS",
    payload: {[id: string]: CalendarInfo},
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_SUCCESS",
    payload: {[id: string]: CalendarInfo},
    loadingInfo: LoadingInfo,
  } | {
    type: "CREATE_LOCAL_ENTRY",
    payload: EntryInfo,
  } | {
    type: "SAVE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "SAVE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "SAVE_ENTRY_SUCCESS",
    payload: {
      localID: ?string,
      serverID: string,
      day: number,
      text: string,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "CONCURRENT_MODIFICATION_RESET",
    payload: {
      serverID: string,
      day: number,
      dbText: string,
    },
  } | {
    type: "DELETE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {
      localID: ?string,
      serverID: ?string,
      day: number,
    },
  } | {
    type: "DELETE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ENTRY_SUCCESS",
    loadingInfo: LoadingInfo,
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
