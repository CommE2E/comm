// @flow

import {
  useConnectModal,
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
  useModalState,
  ConnectButton,
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

import type { SIWEWebViewMessage } from 'lib/types/siwe-types';
import { siweStatement } from 'lib/utils/siwe-utils.js';

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

function postMessageToNativeWebView(message: SIWEWebViewMessage) {
  window.ReactNativeWebView?.postMessage?.(JSON.stringify(message));
}

async function signInWithEthereum(address: string, signer, nonce: string) {
  invariant(nonce, 'nonce must be present in signInWithEthereum');
  const message = createSiweMessage(address, siweStatement, nonce);
  const signature = await signer.signMessage(message);
  postMessageToNativeWebView({
    type: 'siwe_success',
    address,
    message,
    signature,
  });
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
    if (hasNonce && openConnectModal) {
      openConnectModal();
    }
  }, [hasNonce, openConnectModal]);

  const prevConnectModalOpen = React.useRef(false);
  const modalState = useModalState();
  const { connectModalOpen } = modalState;
  React.useEffect(() => {
    if (!connectModalOpen && prevConnectModalOpen.current && !signer) {
      postMessageToNativeWebView({ type: 'siwe_closed' });
    }
    prevConnectModalOpen.current = connectModalOpen;
  }, [connectModalOpen, signer]);

  const newModalAppeared = React.useCallback(mutationList => {
    for (const mutation of mutationList) {
      for (const addedNode of mutation.addedNodes) {
        if (
          addedNode instanceof HTMLElement &&
          addedNode.id === 'walletconnect-wrapper'
        ) {
          postMessageToNativeWebView({
            type: 'walletconnect_modal_update',
            state: 'open',
          });
        }
      }
      for (const addedNode of mutation.removedNodes) {
        if (
          addedNode instanceof HTMLElement &&
          addedNode.id === 'walletconnect-wrapper'
        ) {
          postMessageToNativeWebView({
            type: 'walletconnect_modal_update',
            state: 'closed',
          });
        }
      }
    }
  }, []);

  React.useEffect(() => {
    const observer = new MutationObserver(newModalAppeared);
    invariant(document.body, 'document.body should be set');
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
    };
  }, [newModalAppeared]);

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
      <div className={css.wrapper}>
        <div className={css.walletDisplay}>
          <span className={css.walletDisplayText}>Wallet Connected:</span>
          <ConnectButton />
        </div>
        <p>
          To complete the login process, you&apos;ll now be asked to sign a
          message using your wallet.
        </p>
        <p>
          This signature will attest that your Ethereum identity is represented
          by your new Comm identity.
        </p>
        <div className={css.button} onClick={onClick}>
          Sign in
        </div>
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

export default SIWEWrapper;
