// @flow

import type { AppState } from '../types/redux-types';
import type { CalendarQuery } from '../types/entry-types';
import type { LogInExtraInfo } from '../types/account-types';
import { isDeviceType } from '../types/device-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PreRequestUserState } from '../types/session-types';

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors';
import { getConfig } from '../utils/config';

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
    const platform = getConfig().platformDetails.platform;
    if (deviceToken && isDeviceType(platform)) {
      deviceTokenUpdateRequest = { deviceToken };
    }
    // Return a function since we depend on the time of evaluation
    return (calendarActive: boolean): LogInExtraInfo => ({
      calendarQuery: calendarQuery(calendarActive),
      deviceTokenUpdateRequest,
    });
  },
);

const preRequestUserStateSelector: (
  state: AppState,
) => PreRequestUserState = createSelector(
  (state: AppState) => state.currentUserInfo,
  (state: AppState) => state.cookie,
  (state: AppState) => state.sessionID,
  (currentUserInfo: ?CurrentUserInfo, cookie: ?string, sessionID: ?string) => ({
    currentUserInfo,
    cookie,
    sessionID,
  }),
);

export { logInExtraInfoSelector, preRequestUserStateSelector };
