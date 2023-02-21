// @flow

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  // eslint-disable-next-line import/extensions
} from '@rainbow-me/rainbowkit/wallets';
import * as React from 'react';
import { configureChains, createClient, useProvider } from 'wagmi';
// eslint-disable-next-line import/extensions
import { mainnet } from 'wagmi/chains';
// eslint-disable-next-line import/extensions
import { alchemyProvider } from 'wagmi/providers/alchemy';
// eslint-disable-next-line import/extensions
import { publicProvider } from 'wagmi/providers/public';

import { ENSCacheProvider } from '../components/ens-cache-provider.react.js';

// details can be found at https://wagmi.sh/core/providers/configuring-chains

type WagmiChainConfiguration = {
  +chains: mixed,
  +provider: mixed,
};
function configureWagmiChains(alchemyKey: ?string): WagmiChainConfiguration {
  const availableProviders = alchemyKey
    ? [alchemyProvider({ apiKey: alchemyKey })]
    : [publicProvider()];
  const { chains, provider } = configureChains([mainnet], availableProviders);
  return { chains, provider };
}

type WagmiClientInput = {
  +provider: mixed,
  +connectors?: mixed,
};
function createWagmiClient(input: WagmiClientInput): mixed {
  const { provider, connectors } = input;
  return createClient({
    autoConnect: true,
    connectors,
    provider,
  });
}

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

export {
  configureWagmiChains,
  createWagmiClient,
  wagmiClient,
  wagmiChains,
  WagmiENSCacheProvider,
};
