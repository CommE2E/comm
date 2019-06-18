// @flow

import type { LogInExtraInfo } from 'lib/types/account-types';
import type { AppState } from '../redux/redux-setup';

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

import { calendarActiveSelector } from './nav-selectors';

const nativeLogInExtraInfoSelector: (
  state: AppState,
) => () => LogInExtraInfo = createSelector(
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
