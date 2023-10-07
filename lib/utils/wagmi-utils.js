// @flow

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  // eslint-disable-next-line import/extensions
} from '@rainbow-me/rainbowkit/wallets';
import { ethers } from 'ethers';
import * as React from 'react';
import { configureChains, createConfig } from 'wagmi';
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
  +publicClient: mixed,
};
function configureWagmiChains(alchemyKey: ?string): WagmiChainConfiguration {
  const availableProviders = alchemyKey
    ? [alchemyProvider({ apiKey: alchemyKey })]
    : [publicProvider()];
  const { chains, publicClient } = configureChains(
    [mainnet],
    availableProviders,
  );
  return { chains, publicClient };
}

type WagmiClientInput = {
  +publicClient: mixed,
  +connectors?: mixed,
};
function createWagmiConfig(input: WagmiClientInput): mixed {
  const { publicClient, connectors } = input;
  return createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  });
}

const { chains, publicClient } = configureWagmiChains(
  process.env.COMM_ALCHEMY_KEY,
);

const wallets = [injectedWallet({ chains })];
const projectId = process.env.COMM_WALLETCONNECT_KEY;
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

const wagmiConfig: mixed = createWagmiConfig({ connectors, publicClient });
const wagmiChains: mixed = chains;

const ethersAlchemyProvider = new ethers.providers.AlchemyProvider(
  'mainnet',
  process.env.COMM_ALCHEMY_KEY,
);

type Props = {
  +children: React.Node,
};
function AlchemyENSCacheProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <ENSCacheProvider provider={ethersAlchemyProvider}>
      {children}
    </ENSCacheProvider>
  );
}

export { wagmiConfig, wagmiChains, AlchemyENSCacheProvider };
