// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';

import baseReducer from 'lib/reducers/master-reducer';

import React from 'react';

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
  userInfo: ?UserInfo,
  sessionID: string,
  verifyField: ?number,
  resetPasswordUsername: string,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
};

export type Action = BaseAction<AppState> |
  { type: "REFLECT_ROUTE_CHANGE", payload: NavInfo };

export function reducer(state: AppState, action: Action) {
  if (action.type === "REFLECT_ROUTE_CHANGE") {
    return {
      ...state,
      navInfo: action.payload,
    };
  }
  return baseReducer(state, action);
}
