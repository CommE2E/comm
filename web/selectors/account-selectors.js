// @flow

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import type { LogInExtraInfo } from 'lib/types/account-types.js';

import type { AppState } from '../redux/redux-setup.js';

const webLogInExtraInfoSelector: (state: AppState) => () => LogInExtraInfo =
  createSelector(
    logInExtraInfoSelector,
    (state: AppState) => state.navInfo.tab === 'calendar',
    (
        logInExtraInfoFunc: (calendarActive: boolean) => LogInExtraInfo,
        calendarActive: boolean,
      ) =>
      () =>
        logInExtraInfoFunc(calendarActive),
  );

export { webLogInExtraInfoSelector };
