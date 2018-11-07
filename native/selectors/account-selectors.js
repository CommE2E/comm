// @flow

import type { AppState } from '../redux-setup';
import type { LogInExtraInfo } from 'lib/types/account-types';

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

import { createActiveTabSelector } from './nav-selectors';
import { CalendarRouteName } from '../navigation/route-names';

const calendarActiveSelector = createActiveTabSelector(CalendarRouteName);
const nativeLogInExtraInfoSelector = createSelector(
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
