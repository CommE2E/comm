// @flow

import * as React from 'react';

import { ENSCache, type EthersProvider } from '../utils/ens-cache';

type ENSCacheContextType = {
  +ensCache: ?ENSCache,
};
const ENSCacheContext: React.Context<ENSCacheContextType> = React.createContext<ENSCacheContextType>(
  {
    ensCache: undefined,
  },
);

type Props = {
  +provider: EthersProvider,
  +children: React.Node,
};
function ENSCacheProvider(props: Props): React.Node {
  const { provider, children } = props;
  const context = React.useMemo(
    () => ({
      ensCache: new ENSCache(provider),
    }),
    [provider],
  );
  return (
    <ENSCacheContext.Provider value={context}>
      {children}
    </ENSCacheContext.Provider>
  );
}

export { ENSCacheContext, ENSCacheProvider };
