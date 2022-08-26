// @flow

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import { BrowserRouter } from 'react-router-dom';
import '@rainbow-me/rainbowkit/dist/index.css';
import { chain, configureChains, createClient, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

import Landing from './landing.react';

const { chains, provider } = configureChains(
  [chain.mainnet, chain.polygon, chain.optimism, chain.arbitrum],
  [publicProvider()],
);

const { connectors } = getDefaultWallets({
  appName: 'comm',
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

declare var routerBasename: string;

function RootComponent() {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <BrowserRouter basename={routerBasename}>
          <Landing />
        </BrowserRouter>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

const HotReloadingRootComponent: React.ComponentType<{}> = hot(RootComponent);

export default HotReloadingRootComponent;
