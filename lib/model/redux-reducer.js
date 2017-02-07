// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './entry-info';

export type BaseNavInfo = {
  home: bool,
  calendarID: ?string,
};

export type UserInfo = {
  username: string,
  email: string,
  emailVerified: bool,
};

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
