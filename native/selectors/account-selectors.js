// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import { logInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import { currentAsOfSelector } from 'lib/selectors/keyserver-selectors.js';
import type { LogInExtraInfo } from 'lib/types/account-types.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import { values } from 'lib/utils/objects.js';

import { commCoreModule } from '../native-modules.js';
import type { AppState } from '../redux/state-types.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { NavPlusRedux } from '../types/selector-types.js';

const nativeLogInExtraInfoSelector: (
  input: NavPlusRedux,
) => () => Promise<LogInExtraInfo> = createSelector(
  (input: NavPlusRedux) => logInExtraInfoSelector(input.redux),
  (logInExtraInfo: LogInExtraInfo) => {
    const loginExtraFuncWithIdentityKey = async () => {
      await commCoreModule.initializeCryptoAccount();
      const { blobPayload, signature } =
        await commCoreModule.getUserPublicKey();
      const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
        payload: blobPayload,
        signature,
      };
      return {
        ...logInExtraInfo,
        signedIdentityKeysBlob,
      };
    };
    return loginExtraFuncWithIdentityKey;
  },
);

const baseNoDataAfterPolicyAcknowledgmentSelector: (
  keyserverID: string,
) => (state: AppState) => boolean = keyserverID =>
  createSelector(
    (state: AppState) => state.connectivity,
    currentAsOfSelector(keyserverID),
    (state: AppState) => state.userPolicies,
    (
      connectivity: ConnectivityInfo,
      currentAsOf: number,
      userPolicies: UserPolicies,
    ) =>
      connectivity.connected &&
      currentAsOf === 0 &&
      values(userPolicies).length > 0 &&
      values(userPolicies).every(policy => policy.isAcknowledged),
  );

const noDataAfterPolicyAcknowledgmentSelector: (
  keyserverID: string,
) => (state: AppState) => boolean = _memoize(
  baseNoDataAfterPolicyAcknowledgmentSelector,
);

export {
  nativeLogInExtraInfoSelector,
  noDataAfterPolicyAcknowledgmentSelector,
};
