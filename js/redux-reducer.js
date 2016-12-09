// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './calendar/entry-info';
import type { LoadingStatus } from './loading-indicator.react';

import invariant from 'invariant';

export type NavInfo = {
  year: number,
  month: number, // 1-indexed
  home: bool,
  calendarID: ?string,
  verify: ?string,
};

export type AppState = {
  navInfo: NavInfo,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
  sessionID: string,
  verifyField: ?number,
  resetPasswordUsername: string,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  calendarInfos: {[id: string]: CalendarInfo},
  newCalendarID: ?string,
  entriesLoadingStatus: LoadingStatus,
};

export type UpdateCallback = (prevState: AppState) => AppState;
export type UpdateStore = (update: UpdateCallback) => void;

export type Action =
  { type: "@@redux/INIT" } |
  { type: "GENERIC", callback: UpdateCallback };

export default function reducer(state: AppState, action: Action) {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  return state;
}
