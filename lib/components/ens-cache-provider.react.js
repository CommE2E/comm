// @flow

import { addEnsContracts } from '@ensdomains/ensjs';
import * as React from 'react';
import { createClient } from 'viem';
// eslint-disable-next-line import/extensions
import { mainnet } from 'viem/chains';

import type { EthersProvider } from '../types/ethers-types.js';
import { ENSCache } from '../utils/ens-cache.js';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from '../utils/ens-helpers.js';
import { ENSWrapper } from '../utils/ens-wrapper.js';
import { getAlchemyMainnetViemTransport } from '../utils/viem-utils.js';

type BaseUserInfo = { +username?: ?string, ... };

type ENSCacheContextType = {
  +ensCache: ?ENSCache,
  +getENSNames: ?GetENSNames,
};
const defaultContext = {
  ensCache: undefined,
  getENSNames: undefined,
};
const ENSCacheContext: React.Context<ENSCacheContextType> =
  React.createContext<ENSCacheContextType>(defaultContext);

type Props = {
  +ethersProvider: ?EthersProvider,
  +alchemyKey: ?string,
  +children: React.Node,
};
function ENSCacheProvider(props: Props): React.Node {
  const { ethersProvider, alchemyKey, children } = props;
  const context = React.useMemo(() => {
    if (!ethersProvider) {
      return defaultContext;
    }
    const viemTransport = getAlchemyMainnetViemTransport(alchemyKey);
    const viemClient = createClient({
      chain: addEnsContracts(mainnet),
      transport: viemTransport,
    });
    const ensWrapper = new ENSWrapper(viemClient, ethersProvider);
    const ensCache = new ENSCache(ensWrapper);
    const getENSNames: GetENSNames = <T: ?BaseUserInfo>(
      users: $ReadOnlyArray<T>,
    ): Promise<T[]> => baseGetENSNames(ensCache, users);
    return { ensCache, getENSNames };
  }, [ethersProvider, alchemyKey]);
  return (
    <ENSCacheContext.Provider value={context}>
      {children}
    </ENSCacheContext.Provider>
  );
}

export { ENSCacheContext, ENSCacheProvider };
