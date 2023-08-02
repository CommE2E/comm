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

const wallets = [injectedWallet({ chains })];
const projectId = 'fdb51537c1ed7a73d64b4ae5db229939';
if (projectId) {
  wallets.push(
    rainbowWallet({ chains, projectId }),
    metaMaskWallet({ chains, projectId }),
    walletConnectWallet({ chains, projectId }),
  );
}

const connectors = connectorsForWallets([
  { groupName: 'Recommended', wallets },
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
