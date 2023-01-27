// @flow

import * as React from 'react';

import { ENSCacheContext } from '../components/ens-cache-provider.react';
import { userIdentifiedByETHAddress } from '../shared/account-utils';
import { stringForUser } from '../shared/user-utils';
import type { RelativeMemberInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

function useStringForUser(
  user: ?(RelativeUserInfo | RelativeMemberInfo),
): ?string {
  const ethAddress = React.useMemo(() => {
    if (
      !user ||
      user.isViewer ||
      !user.username ||
      !userIdentifiedByETHAddress(user)
    ) {
      return null;
    }
    return user.username;
  }, [user]);

  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;
  const cachedResult =
    ethAddress && ensCache
      ? ensCache.getCachedNameForAddress(ethAddress)
      : null;

  const [ensName, setENSName] = React.useState<?string>(null);

  React.useEffect(() => {
    // Whenever the ETH address changes, clear out ENS name before requery below
    setENSName(null);
  }, [ethAddress]);

  React.useEffect(() => {
    if (cachedResult || !ethAddress || !ensCache) {
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await ensCache.getNameForAddress(ethAddress);
      if (result && !cancelled) {
        setENSName(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cachedResult, ethAddress, ensCache]);

  if (ensName) {
    return ensName;
  } else if (cachedResult) {
    return cachedResult;
  } else if (user) {
    return stringForUser(user);
  } else {
    return null;
  }
}

export { useStringForUser };
