// @flow

import type { LogInExtraInfo } from 'lib/types/account-types';
import type { NavPlusRedux } from '../types/selector-types';

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

import { calendarActiveSelector } from '../navigation/nav-selectors';

const nativeLogInExtraInfoSelector: (
  input: NavPlusRedux,
) => () => LogInExtraInfo = createSelector(
  (input: NavPlusRedux) => logInExtraInfoSelector(input.redux),
  (input: NavPlusRedux) => calendarActiveSelector(input.navContext),
  (
    logInExtraInfoFunc: (calendarActive: boolean) => LogInExtraInfo,
    calendarActive: boolean,
  ) => () => logInExtraInfoFunc(calendarActive),
);

export { nativeLogInExtraInfoSelector };
