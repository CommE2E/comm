// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import { legacyLogInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import { currentAsOfSelector } from 'lib/selectors/keyserver-selectors.js';
import type { LegacyLogInExtraInfo } from 'lib/types/account-types.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import { values } from 'lib/utils/objects.js';

import { commCoreModule } from '../native-modules.js';
import type { AppState } from '../redux/state-types.js';
import type { ConnectivityInfo } from '../types/connectivity.js';

const nativeLegacyLogInExtraInfoSelector: (
  state: AppState,
) => () => Promise<LegacyLogInExtraInfo> = createSelector(
  legacyLogInExtraInfoSelector,
  (logInExtraInfo: LegacyLogInExtraInfo) => {
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
  nativeLegacyLogInExtraInfoSelector,
  noDataAfterPolicyAcknowledgmentSelector,
};
