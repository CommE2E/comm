// @flow

import { configureChains, createClient } from 'wagmi';
// eslint-disable-next-line import/extensions
import { mainnet } from 'wagmi/chains';
// eslint-disable-next-line import/extensions
import { alchemyProvider } from 'wagmi/providers/alchemy';
// eslint-disable-next-line import/extensions
import { publicProvider } from 'wagmi/providers/public';

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

export { configureWagmiChains, createWagmiClient };
