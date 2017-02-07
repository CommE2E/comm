// @flow

import type { CalendarInfo } from 'lib/model/calendar-info';
import type { EntryInfo } from 'lib/model/entry-info';
import type { LoadingStatus } from './loading-indicator.react';

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
