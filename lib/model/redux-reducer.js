// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './entry-info';

export type BaseNavInfo = {
  home: bool,
  calendarID: ?string,
};

export type BaseAppState = {
  +navInfo: BaseNavInfo,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
  sessionID: string,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  calendarInfos: {[id: string]: CalendarInfo},
};

export type UpdateCallback<T: BaseAppState> = (prevState: T) => T;
export type UpdateStore<T: BaseAppState> = (update: UpdateCallback<T>) => void;

export type Action<T: BaseAppState> =
  { type: "@@redux/INIT" } |
  { type: "GENERIC", callback: UpdateCallback<T> };

export function reducer<T: BaseAppState>(state: T, action: Action<T>) {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  return state;
}
