// @flow

import {
  useConnectModal,
  RainbowKitProvider,
  darkTheme,
  useModalState,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
  // eslint-disable-next-line import/extensions
} from '@rainbow-me/rainbowkit/wallets';
import invariant from 'invariant';
import _merge from 'lodash/fp/merge.js';
import * as React from 'react';
import { useAccount, useSigner, WagmiConfig } from 'wagmi';

import ConnectedWalletInfo from 'lib/components/connected-wallet-info.react.js';
import type { SIWEWebViewMessage } from 'lib/types/siwe-types.js';
import {
  getSIWEStatementForPublicKey,
  siweStatementWithoutPublicKey,
  siweMessageSigningExplanationStatements,
  createSIWEMessage,
} from 'lib/utils/siwe-utils.js';
import {
  WagmiENSCacheProvider,
  configureWagmiChains,
  createWagmiClient,
} from 'lib/utils/wagmi-utils.js';

import { SIWEContext } from './siwe-context.js';
import css from './siwe.css';

const { chains, provider } = configureWagmiChains(process.env.COMM_ALCHEMY_KEY);
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      injectedWallet({ chains }),
      rainbowWallet({ chains }),
      metaMaskWallet({ chains }),
      walletConnectWallet({ chains }),
    ],
  },
]);
const wagmiClient = createWagmiClient({ connectors, provider });

function postMessageToNativeWebView(message: SIWEWebViewMessage) {
  window.ReactNativeWebView?.postMessage?.(JSON.stringify(message));
}

async function signInWithEthereum(
  address: string,
  signer,
  nonce: string,
  statement: string,
) {
  invariant(nonce, 'nonce must be present in signInWithEthereum');
  const message = createSIWEMessage(address, statement, nonce);
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
  const { siweNonce, siwePrimaryIdentityPublicKey } =
    React.useContext(SIWEContext);
  const onClick = React.useCallback(() => {
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    const statement = siwePrimaryIdentityPublicKey
      ? getSIWEStatementForPublicKey(siwePrimaryIdentityPublicKey)
      : siweStatementWithoutPublicKey;
    signInWithEthereum(address, signer, siweNonce, statement);
  }, [address, signer, siweNonce, siwePrimaryIdentityPublicKey]);

  const { openConnectModal } = useConnectModal();
  const hasNonce = siweNonce !== null && siweNonce !== undefined;
  React.useEffect(() => {
    if (hasNonce && openConnectModal) {
      openConnectModal();
    }
  }, [hasNonce, openConnectModal]);

  const prevConnectModalOpen = React.useRef(false);
  const modalState = useModalState();
  const closeTimeoutRef = React.useRef();
  const { connectModalOpen } = modalState;
  React.useEffect(() => {
    if (!connectModalOpen && prevConnectModalOpen.current && !signer) {
      closeTimeoutRef.current = setTimeout(
        () => postMessageToNativeWebView({ type: 'siwe_closed' }),
        50,
      );
    } else if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = undefined;
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
        <span className={css.walletDisplayText}>
          <p>Wallet Connected</p>
        </span>
        <div className={css.connectedWalletInfo}>
          <ConnectedWalletInfo />
        </div>
        <p>{siweMessageSigningExplanationStatements}</p>
        <p>
          By signing up, you agree to our{' '}
          <a href="https://comm.app/terms">Terms of Use</a> &{' '}
          <a href="https://comm.app/privacy">Privacy Policy</a>.
        </p>
        <div className={css.button} onClick={onClick}>
          Sign in using this wallet
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
      <WagmiENSCacheProvider>
        <RainbowKitProvider theme={theme} modalSize="compact" chains={chains}>
          <SIWE />
        </RainbowKitProvider>
      </WagmiENSCacheProvider>
    </WagmiConfig>
  );
}

export default SIWEWrapper;
