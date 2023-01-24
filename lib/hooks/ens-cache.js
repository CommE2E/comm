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
  const rawStringForUser = user ? stringForUser(user) : null;
  const [ensName, setENSName] = React.useState<?string>(null);

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

  React.useEffect(() => {
    // Whenever the ETH address changes, clear out ENS name before requery below
    setENSName(null);
  }, [ethAddress]);

  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;
  React.useEffect(() => {
    if (!ethAddress || !ensCache) {
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
  }, [ethAddress, ensCache]);

  return ensName ?? rawStringForUser;
}

export { useStringForUser };
