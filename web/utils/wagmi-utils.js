// @flow

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
  // eslint-disable-next-line import/extensions
} from '@rainbow-me/rainbowkit/wallets';
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
      injectedWallet({ chains }),
      rainbowWallet({ chains }),
      metaMaskWallet({ chains }),
      walletConnectWallet({ chains }),
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
