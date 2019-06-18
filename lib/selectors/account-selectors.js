// @flow

import type { AppState } from '../types/redux-types';
import type { CalendarQuery } from '../types/entry-types';
import type { LogInExtraInfo } from '../types/account-types';
import { isDeviceType, assertDeviceType } from '../types/device-types';

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors';
import { getConfig } from '../utils/config';

const logInExtraInfoSelector: (
  state: AppState,
) => (calendarActive: bool) => LogInExtraInfo = createSelector(
  (state: AppState) => state.deviceToken,
  currentCalendarQuery,
  (
    deviceToken: ?string,
    calendarQuery: (calendarActive: bool) => CalendarQuery,
  ) => {
    let deviceTokenUpdateRequest = null;
    const platform = getConfig().platformDetails.platform;
    if (deviceToken && isDeviceType(platform)) {
      deviceTokenUpdateRequest = { deviceToken };
    }
    // Return a function since we depend on the time of evaluation
    return (calendarActive: bool): LogInExtraInfo => ({
      calendarQuery: calendarQuery(calendarActive),
      deviceTokenUpdateRequest,
    });
  },
);

export {
  logInExtraInfoSelector,
};
