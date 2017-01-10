// @flow

import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './calendar/entry-info';
import type { LoadingStatus } from './loading-indicator.react';

import React from 'react';
import invariant from 'invariant';
import update from 'immutability-helper';

import { subscriptionExists } from './calendar-utils';

export type NavInfo = {
  year: number,
  month: number, // 1-indexed
  home: bool,
  calendarID: ?string,
  verify: ?string,
};

export const navInfoPropType = React.PropTypes.shape({
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  home: React.PropTypes.bool.isRequired,
  calendarID: React.PropTypes.string,
  verify: React.PropTypes.string,
});

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

function ensureNavValidity(state: AppState): AppState {
  // TODO stop defaulting to calendar 254
  if (state.navInfo.home && !subscriptionExists(state)) {
    return update(state, { navInfo: {
      home: { $set: false },
      calendarID: { $set: "254" },
    }});
  }
  return state;
}

export function reducer(state: AppState, action: Action) {
  if (action.type === "GENERIC") {
    return ensureNavValidity(action.callback(state));
  }
  return state;
}
