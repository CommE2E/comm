// @flow

import {
  ConnectButton,
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import invariant from 'invariant';
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

import { SIWENonceContext } from './siwe-nonce-context.js';
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

function createSiweMessage(address: string, statement: string, nonce: string) {
  invariant(nonce, 'nonce must be present in createSiweMessage');
  const domain = window.location.host;
  const origin = window.location.origin;
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: '1',
    nonce,
  });
  return message.prepareMessage();
}

async function signInWithEthereum(address: string, signer, nonce: string) {
  invariant(nonce, 'nonce must be present in signInWithEthereum');
  const message = createSiweMessage(
    address,
    'By continuing, I accept the Comm Terms of Service: https://comm.app/terms',
    nonce,
  );
  const signature = await signer.signMessage(message);
  const messageToPost = JSON.stringify({ address, message, signature });
  window.ReactNativeWebView?.postMessage?.(messageToPost);
  return signature;
}

function SIWE(): React.Node {
  const { address } = useAccount();
  const { data: signer } = useSigner();
  const { siweNonce } = React.useContext(SIWENonceContext);
  const onClick = React.useCallback(() => {
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    signInWithEthereum(address, signer, siweNonce);
  }, [address, signer, siweNonce]);

  if (siweNonce === null || siweNonce === undefined) {
    return (
      <div className={css.wrapper}>
        <h1 className={css.h1}>Unable to proceed: nonce not found.</h1>
      </div>
    );
  }

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
