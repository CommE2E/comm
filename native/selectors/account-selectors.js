// @flow

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';
import type { LogInExtraInfo } from 'lib/types/account-types';

import { calendarActiveSelector } from '../navigation/nav-selectors';
import type { NavPlusRedux } from '../types/selector-types';

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
