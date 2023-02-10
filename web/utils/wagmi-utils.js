// @flow

import { connectorsForWallets, wallet } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useProvider } from 'wagmi';

import { ENSCacheProvider } from 'lib/components/ens-cache-provider.react.js';
import {
  configureWagmiChains,
  createWagmiClient,
} from 'lib/utils/wagmi-utils.js';

const { chains, provider } = configureWagmiChains(process.env.COMM_ALCHEMY_KEY);
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      wallet.injected({ chains }),
      wallet.rainbow({ chains }),
      wallet.metaMask({ chains }),
      wallet.walletConnect({ chains }),
    ],
  },
]);
const wagmiClient: mixed = createWagmiClient({ connectors, provider });
const wagmiChains: mixed = chains;

type Props = {
  +children: React.Node,
};
function WagmiENSCacheProvider(props: Props): React.Node {
  const { children } = props;
  const wagmiProvider = useProvider();
  return (
    <ENSCacheProvider provider={wagmiProvider}>{children}</ENSCacheProvider>
  );
}

export { wagmiClient, wagmiChains, WagmiENSCacheProvider };
