// @flow

import { chain, configureChains, createClient } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy/dist/wagmi-providers-alchemy.esm.js';
import { publicProvider } from 'wagmi/providers/public/dist/wagmi-providers-public.esm.js';

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

export { configureWagmiChains, createWagmiClient };
