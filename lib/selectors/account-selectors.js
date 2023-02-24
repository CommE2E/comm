// @flow

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors.js';
import type { LogInExtraInfo } from '../types/account-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { AppState } from '../types/redux-types.js';
import type { PreRequestUserState } from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

const logInExtraInfoSelector: (
  state: AppState,
) => (calendarActive: boolean) => LogInExtraInfo = createSelector(
  (state: AppState) => state.deviceToken,
  currentCalendarQuery,
  (
    deviceToken: ?string,
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
  ) => {
    let deviceTokenUpdateRequest = null;
    if (deviceToken) {
      deviceTokenUpdateRequest = { deviceToken };
    }
    // Return a function since we depend on the time of evaluation
    return (calendarActive: boolean): LogInExtraInfo => ({
      calendarQuery: calendarQuery(calendarActive),
      deviceTokenUpdateRequest,
    });
  },
);

const preRequestUserStateSelector: (state: AppState) => PreRequestUserState =
  createSelector(
    (state: AppState) => state.currentUserInfo,
    (state: AppState) => state.cookie,
    (state: AppState) => state.sessionID,
    (
      currentUserInfo: ?CurrentUserInfo,
      cookie: ?string,
      sessionID: ?string,
    ) => ({
      currentUserInfo,
      cookie,
      sessionID,
    }),
  );

export { logInExtraInfoSelector, preRequestUserStateSelector };
