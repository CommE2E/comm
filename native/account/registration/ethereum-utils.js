// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react.js';
import {
  identitySIWENonceLifetime,
  type SIWEResult,
} from 'lib/types/siwe-types.js';

import { RegistrationContext } from './registration-context.js';
import {
  type EthereumAccountSelection,
  ensAvatarSelection,
} from './registration-types.js';

function useGetEthereumAccountFromSIWEResult(): (
  result: SIWEResult,
) => Promise<EthereumAccountSelection> {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { setCachedSelections } = registrationContext;

  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;

  return React.useCallback(
    async result => {
      // We want to figure out if the user has an ENS avatar now
      // so that we can default to the ENS avatar in AvatarSelection
      let avatarURI: ?string = null;
      if (ensCache) {
        avatarURI = await ensCache.getAvatarURIForAddress(result.address);
      }

      const ethereumAccount = {
        accountType: 'ethereum',
        ...result,
        avatarURI,
      };

      setCachedSelections(oldUserSelections => {
        const base = {
          ...oldUserSelections,
          ethereumAccount,
        };
        if (base.avatarData || !avatarURI) {
          return base;
        }
        return {
          ...base,
          avatarData: ensAvatarSelection,
        };
      });

      return ethereumAccount;
    },
    [ensCache, setCachedSelections],
  );
}

function siweNonceExpired(nonceTimestamp: number): boolean {
  return Date.now() > nonceTimestamp + identitySIWENonceLifetime;
}

export { useGetEthereumAccountFromSIWEResult, siweNonceExpired };
