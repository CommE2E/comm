// @flow

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
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

const projectId = process.env.COMM_WALLETCONNECT_KEY;
const alchemyKey = process.env.COMM_ALCHEMY_KEY;
const transport = alchemyKey
  ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();

const walletMap = {
  injected: injectedWallet,
  rainbow: rainbowWallet,
  metamask: metaMaskWallet,
  coinbase: coinbaseWallet,
  walletconnect: walletConnectWallet,
};
type Wallet = $Keys<typeof walletMap>;

function getWagmiConfig(walletArr: $ReadOnlyArray<Wallet>): mixed {
  let wallets: Array<mixed>;
  if (!projectId) {
    wallets = walletArr.includes('injected') ? [injectedWallet] : [];
  } else {
    wallets = walletArr.map(wallet => walletMap[wallet]);
  }

  const connectors = connectorsForWallets(
    [{ groupName: 'Recommended', wallets }],
    {
      appName: 'Comm',
      projectId,
    },
  );

  return createConfig({
    connectors,
    chains: [mainnet],
    transports: {
      [mainnet.id]: transport,
    },
    ssr: !process.env.BROWSER,
  });
}

const ethersAlchemyProvider = new AlchemyProvider('mainnet', alchemyKey);

type Props = {
  +children: React.Node,
};
function AlchemyENSCacheProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <ENSCacheProvider
      ethersProvider={ethersAlchemyProvider}
      alchemyKey={alchemyKey}
    >
      {children}
    </ENSCacheProvider>
  );
}

export { getWagmiConfig, AlchemyENSCacheProvider };
