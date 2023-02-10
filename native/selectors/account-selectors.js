// @flow

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import type { LogInExtraInfo } from 'lib/types/account-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import { values } from 'lib/utils/objects.js';

import { calendarActiveSelector } from '../navigation/nav-selectors.js';
import type { AppState } from '../redux/state-types.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { NavPlusRedux } from '../types/selector-types.js';

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

const noDataAfterPolicyAcknowledgmentSelector: (
  state: AppState,
) => boolean = createSelector(
  (state: AppState) => state.connectivity,
  (state: AppState) => state.messageStore.currentAsOf,
  (state: AppState) => state.userPolicies,
  (
    connectivity: ConnectivityInfo,
    currentAsOf: number,
    userPolicies: UserPolicies,
  ) =>
    connectivity.connected &&
    currentAsOf === 0 &&
    values(userPolicies).every(policy => policy.isAcknowledged),
);

export {
  nativeLogInExtraInfoSelector,
  noDataAfterPolicyAcknowledgmentSelector,
};
