// @flow

import {
  useConnectModal,
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import invariant from 'invariant';
import _merge from 'lodash/fp/merge';
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

  const { openConnectModal } = useConnectModal();
  const hasNonce = siweNonce !== null && siweNonce !== undefined;
  React.useEffect(() => {
    if (hasNonce) {
      openConnectModal();
    }
  }, [hasNonce, openConnectModal]);

  if (!hasNonce) {
    return (
      <div className={css.wrapper}>
        <h1 className={css.h1}>Unable to proceed: nonce not found.</h1>
      </div>
    );
  } else if (!signer) {
    return null;
  } else {
    return (
      <div className={css.button} onClick={onClick}>
        <img src="images/ethereum_icon.svg" style={ethIconStyle} />
        sign in
      </div>
    );
  }
}

function SIWEWrapper(): React.Node {
  const theme = React.useMemo(() => {
    return _merge(darkTheme())({
      radii: {
        modal: 0,
        modalMobile: 0,
      },
      colors: {
        modalBackdrop: '#242529',
      },
    });
  }, []);
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider theme={theme} modalSize="compact" chains={chains}>
        <SIWE />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

const ethIconStyle = { height: 25, paddingRight: 10 };

export default SIWEWrapper;
