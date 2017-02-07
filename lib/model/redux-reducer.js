// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './entry-info';

export type BaseNavInfo = {
  home: bool,
  calendarID: ?string,
};

export type BaseAppState<U: BaseNavInfo> = {
  navInfo: U,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
  sessionID: string,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  calendarInfos: {[id: string]: CalendarInfo},
};

export type UpdateCallback<U: BaseNavInfo, T: BaseAppState<U>> = (prevState: T) => T;
export type UpdateStore<U: BaseNavInfo, T: BaseAppState<U>> = (update: UpdateCallback<U, T>) => void;

export type Action<U: BaseNavInfo, T: BaseAppState<U>> =
  { type: "@@redux/INIT" } |
  { type: "GENERIC", callback: UpdateCallback<U, T> };

export function reducer<U: BaseNavInfo, T: BaseAppState<U>>(state: T, action: Action<U, T>) {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  return state;
}
