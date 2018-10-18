// @flow

import type { AppState } from '../types/redux-types';
import type { CalendarQuery } from '../types/entry-types';
import type { LogInExtraInfo } from '../types/account-types';
import { isDeviceType, assertDeviceType } from '../types/device-types';

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors';
import { getConfig } from '../utils/config';

const logInExtraInfoSelector = createSelector(
  (state: AppState) => state.deviceToken,
  currentCalendarQuery,
  (
    deviceToken: ?string,
    calendarQuery: () => CalendarQuery,
  ) => {
    let deviceTokenUpdateRequest = null;
    const platform = getConfig().platformDetails.platform;
    if (deviceToken && isDeviceType(platform)) {
      deviceTokenUpdateRequest = { deviceToken };
    }
    // Return a function since we depend on the time of evaluation
    return (): LogInExtraInfo => ({
      calendarQuery: calendarQuery(),
      deviceTokenUpdateRequest,
    });
  },
);

export {
  logInExtraInfoSelector,
};
