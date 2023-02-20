// @flow

import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import type { LogInExtraInfo } from 'lib/types/account-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import { values } from 'lib/utils/objects.js';

import { commCoreModule } from '../native-modules.js';
import { calendarActiveSelector } from '../navigation/nav-selectors.js';
import type { AppState } from '../redux/state-types.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { NavPlusRedux } from '../types/selector-types.js';

const nativeLogInExtraInfoSelector: (
  input: NavPlusRedux,
) => () => Promise<LogInExtraInfo> = createSelector(
  (input: NavPlusRedux) => logInExtraInfoSelector(input.redux),
  (input: NavPlusRedux) => calendarActiveSelector(input.navContext),
  (
    logInExtraInfoFunc: (calendarActive: boolean) => LogInExtraInfo,
    calendarActive: boolean,
  ) => {
    const loginExtraFuncWithIdentityKey = async () => {
      await commCoreModule.initializeCryptoAccount();
      const { ed25519 } = await commCoreModule.getUserPublicKey();
      return {
        ...logInExtraInfoFunc(calendarActive),
        primaryIdentityPublicKey: ed25519,
      };
    };
    return loginExtraFuncWithIdentityKey;
  },
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
