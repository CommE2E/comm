// @flow

import type { AppState } from '../redux-setup';
import type { LogInExtraInfo } from 'lib/types/account-types';

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

const webLogInExtraInfoSelector: (
  state: AppState,
) => () => LogInExtraInfo = createSelector(
  logInExtraInfoSelector,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    logInExtraInfoFunc: (calendarActive: boolean) => LogInExtraInfo,
    calendarActive: boolean,
  ) => () => logInExtraInfoFunc(calendarActive),
);

export { webLogInExtraInfoSelector };
