// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type {
  UserInfo,
  LoadingStatus,
  BaseAction,
} from 'lib/types/redux-types';

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
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
};

export type Action = BaseAction<AppState>;

export function reducer(state: AppState, action: Action) {
  return baseReducer(state, action);
}
