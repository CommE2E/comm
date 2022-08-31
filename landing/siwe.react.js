// @flow

import {
  ConnectButton,
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { SiweMessage } from 'siwe';
import '@rainbow-me/rainbowkit/dist/index.css';
import {
  useAccount,
  useSigner,
  chain,
  configureChains,
  createClient,
  WagmiConfig,
} from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

import css from './siwe.css';

const { chains, provider } = configureChains(
  [chain.mainnet],
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

function createSiweMessage(address, statement) {
  const domain = window.location.host;
  const origin = window.location.origin;
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: '1',
  });
  return message.prepareMessage();
}

async function signInWithEthereum(address, signer) {
  const message = createSiweMessage(address, 'Sign in to Comm with Ethereum');
  const signedMessage = await signer.signMessage(message);
  window.ReactNativeWebView?.postMessage?.(signedMessage);
  return signedMessage;
}

function SIWE(): React.Node {
  const { data } = useAccount();
  const { address } = data || {};
  const { data: signer } = useSigner();
  return (
    <div className={css.siweWrapper}>
      <h1 className={css.siweh1}>SIWE</h1>
      <ConnectButton />
      <div className={css.siweSpacer} />
      {signer && (
        <div
          className={css.siweButton}
          onClick={() => signInWithEthereum(address, signer)}
        >
          <img
            src="images/ethereum_icon.svg"
            style={{ height: 25, paddingRight: 10 }}
          />
          sign in
        </div>
      )}
    </div>
  );
}
function SIWEWrapper(): React.Node {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <SIWE />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default SIWEWrapper;
