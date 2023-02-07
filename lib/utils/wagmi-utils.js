// @flow

import { connectorsForWallets, wallet } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { chain, configureChains, createClient, useProvider } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import { ENSCacheProvider } from '../components/ens-cache-provider.react';

// details can be found https://0.6.x.wagmi.sh/docs/providers/configuring-chains

type WagmiChainConfiguration = {
  +chains: mixed,
  +provider: mixed,
};
function configureWagmiChains(alchemyKey: ?string): WagmiChainConfiguration {
  const availableProviders = alchemyKey
    ? [alchemyProvider({ apiKey: alchemyKey })]
    : [publicProvider()];
  const { chains, provider } = configureChains(
    [chain.mainnet],
    availableProviders,
  );
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

export {
  wagmiClient,
  wagmiChains,
  WagmiENSCacheProvider,
  configureWagmiChains,
  createWagmiClient,
};
