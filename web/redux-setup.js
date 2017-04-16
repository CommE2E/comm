// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
import type { VerifyField } from 'lib/utils/verify-utils';

import PropTypes from 'prop-types';

import baseReducer from 'lib/reducers/master-reducer';

export type NavInfo = {
  year: number,
  month: number, // 1-indexed
  home: bool,
  calendarID: ?string,
  verify: ?string,
};

export const navInfoPropType = PropTypes.shape({
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  home: PropTypes.bool.isRequired,
  calendarID: PropTypes.string,
  verify: PropTypes.string,
});

export type AppState = {
  navInfo: NavInfo,
  userInfo: ?UserInfo,
  sessionID: string,
  verifyField: ?VerifyField,
  resetPasswordUsername: string,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
};

export type Action = BaseAction |
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
