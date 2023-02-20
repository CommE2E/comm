// @flow

import * as React from 'react';

import { ENSCache, type EthersProvider } from '../utils/ens-cache.js';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from '../utils/ens-helpers.js';

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
  +provider: ?EthersProvider,
  +children: React.Node,
};
function ENSCacheProvider(props: Props): React.Node {
  const { provider, children } = props;
  const context = React.useMemo(() => {
    if (!provider) {
      return defaultContext;
    }
    const ensCache = new ENSCache(provider);
    const getENSNames: GetENSNames = baseGetENSNames.bind(null, ensCache);
    return { ensCache, getENSNames };
  }, [provider]);
  return (
    <ENSCacheContext.Provider value={context}>
      {children}
    </ENSCacheContext.Provider>
  );
}

export { ENSCacheContext, ENSCacheProvider };
