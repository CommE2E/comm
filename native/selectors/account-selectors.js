// @flow

import { createSelector } from 'reselect';

import { legacyLogInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import type { LegacyLogInExtraInfo } from 'lib/types/account-types.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';

import { commCoreModule } from '../native-modules.js';
import type { AppState } from '../redux/state-types.js';

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

export { nativeLegacyLogInExtraInfoSelector };
