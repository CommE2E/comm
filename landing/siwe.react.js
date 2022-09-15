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

// details can be found https://wagmi.sh/docs/providers/configuring-chains
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
  const signature = await signer.signMessage(message);
  const messageToPost = JSON.stringify({ address, signature });
  window.ReactNativeWebView?.postMessage?.(messageToPost);
  return signature;
}

function SIWE(): React.Node {
  const { data } = useAccount();
  const { address } = data || {};
  const { data: signer } = useSigner();
  const onClick = React.useCallback(() => signInWithEthereum(address, signer), [
    address,
    signer,
  ]);
  const SignInButton = !signer ? null : (
    <div className={css.button} onClick={onClick}>
      <img src="images/ethereum_icon.svg" style={ethIconStyle} />
      sign in
    </div>
  );
  return (
    <div className={css.wrapper}>
      <h1 className={css.h1}>SIWE</h1>
      <ConnectButton />
      <div className={css.spacer} />
      {SignInButton}
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

const ethIconStyle = { height: 25, paddingRight: 10 };

export default SIWEWrapper;
