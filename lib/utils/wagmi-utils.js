// @flow

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  // eslint-disable-next-line import/extensions
} from '@rainbow-me/rainbowkit/wallets';
import { AlchemyProvider } from 'ethers';
import * as React from 'react';
import { http } from 'viem';
import { createConfig } from 'wagmi';
// eslint-disable-next-line import/extensions
import { mainnet } from 'wagmi/chains';

import { ENSCacheProvider } from '../components/ens-cache-provider.react.js';

const wallets = [injectedWallet];
const projectId = process.env.COMM_WALLETCONNECT_KEY;
if (projectId) {
  wallets.push(rainbowWallet, metaMaskWallet, walletConnectWallet);
}

const connectors = connectorsForWallets(
  [{ groupName: 'Recommended', wallets }],
  {
    appName: 'Comm',
    projectId,
  },
);

const alchemyKey = process.env.COMM_ALCHEMY_KEY;
const transport = alchemyKey
  ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();
const wagmiConfig: mixed = createConfig({
  connectors,
  chains: [mainnet],
  transports: {
    [mainnet.id]: transport,
  },
});

const ethersAlchemyProvider = new AlchemyProvider('mainnet', alchemyKey);

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

export { wagmiConfig, AlchemyENSCacheProvider };
