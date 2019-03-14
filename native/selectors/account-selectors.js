// @flow

import type { LogInExtraInfo } from 'lib/types/account-types';

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

import { calendarActiveSelector } from './nav-selectors';

const nativeLogInExtraInfoSelector = createSelector<*, *, *, *, *>(
  logInExtraInfoSelector,
  calendarActiveSelector,
  (
    logInExtraInfoFunc: (calendarActive: bool) => LogInExtraInfo,
    calendarActive: bool,
  ) => () => logInExtraInfoFunc(calendarActive),
);

export {
  nativeLogInExtraInfoSelector,
};
