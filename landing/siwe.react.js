// @flow

import {
  useConnectModal,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import classnames from 'classnames';
import invariant from 'invariant';
import _merge from 'lodash/fp/merge.js';
import * as React from 'react';
import { useAccount, useWalletClient, WagmiProvider } from 'wagmi';

import ConnectedWalletInfo from 'lib/components/connected-wallet-info.react.js';
import {
  type SIWEWebViewMessage,
  SIWEMessageTypes,
} from 'lib/types/siwe-types.js';
import {
  getSIWEStatementForPublicKey,
  userTextsForSIWEMessageTypes,
  createSIWEMessage,
} from 'lib/utils/siwe-utils.js';
import {
  AlchemyENSCacheProvider,
  getWagmiConfig,
} from 'lib/utils/wagmi-utils.js';

import { SIWEContext } from './siwe-context.js';
import css from './siwe.css';
import {
  useMonitorForWalletConnectModal,
  type WalletConnectModalUpdate,
} from './walletconnect-hooks.js';

function postMessageToNativeWebView(message: SIWEWebViewMessage) {
  window.ReactNativeWebView?.postMessage?.(JSON.stringify(message));
}

const wagmiConfig = getWagmiConfig([
  'rainbow',
  'metamask',
  'coinbase',
  'walletconnect',
]);

type Signer = {
  +signMessage: ({ +message: string, ... }) => Promise<string>,
  ...
};
async function signInWithEthereum(
  address: string,
  signer: Signer,
  nonce: string,
  statement: string,
  issuedAt: ?string,
) {
  invariant(nonce, 'nonce must be present in signInWithEthereum');
  const message = createSIWEMessage(address, statement, nonce, issuedAt);
  const signature = await signer.signMessage({ message });
  postMessageToNativeWebView({
    type: 'siwe_success',
    address,
    message,
    signature,
  });
}

const queryClient = new QueryClient();

function SIWE(): React.Node {
  const { address } = useAccount();
  const { data: signer } = useWalletClient();
  const {
    siweNonce,
    siwePrimaryIdentityPublicKey,
    siweMessageType,
    siweMessageIssuedAt,
  } = React.useContext(SIWEContext);

  const [inProgress, setInProgress] = React.useState(false);

  const onClick = React.useCallback(async () => {
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    invariant(siweMessageType, 'message type must be set during SIWE attempt');
    invariant(
      siwePrimaryIdentityPublicKey,
      'primaryIdentityPublicKey must be present during SIWE attempt',
    );
    try {
      setInProgress(true);
      const statement = getSIWEStatementForPublicKey(
        siwePrimaryIdentityPublicKey,
        siweMessageType,
      );
      await signInWithEthereum(
        address,
        signer,
        siweNonce,
        statement,
        siweMessageIssuedAt,
      );
    } finally {
      setInProgress(false);
    }
  }, [
    address,
    signer,
    siweNonce,
    siwePrimaryIdentityPublicKey,
    siweMessageType,
    siweMessageIssuedAt,
  ]);

  const { openConnectModal, connectModalOpen } = useConnectModal();
  const hasNonce = siweNonce !== null && siweNonce !== undefined;
  React.useEffect(() => {
    if (hasNonce && openConnectModal) {
      openConnectModal();
    }
  }, [hasNonce, openConnectModal]);

  const [wcModalOpen, setWCModalOpen] = React.useState(false);

  const prevModalOpen = React.useRef(false);
  const modalOpen = connectModalOpen || wcModalOpen;
  React.useEffect(() => {
    if (!modalOpen && prevModalOpen.current && !signer) {
      postMessageToNativeWebView({ type: 'siwe_closed' });
    }
    prevModalOpen.current = modalOpen;
  }, [modalOpen, signer]);

  const onWalletConnectModalUpdate = React.useCallback(
    (update: WalletConnectModalUpdate) => {
      if (update.state === 'closed') {
        setWCModalOpen(false);
        postMessageToNativeWebView({
          type: 'walletconnect_modal_update',
          ...update,
        });
      } else {
        setWCModalOpen(true);
        postMessageToNativeWebView({
          type: 'walletconnect_modal_update',
          ...update,
        });
      }
    },
    [],
  );
  useMonitorForWalletConnectModal(onWalletConnectModalUpdate);
  if (!siweMessageType) {
    return (
      <div className={css.wrapper}>
        <h1 className={css.h1}>Unable to proceed: message type not found</h1>
      </div>
    );
  }
  if (!hasNonce) {
    return (
      <div className={css.wrapper}>
        <h1 className={css.h1}>Unable to proceed: nonce not found.</h1>
      </div>
    );
  }
  if (
    siweMessageType === SIWEMessageTypes.MSG_BACKUP_RESTORE &&
    !siweMessageIssuedAt
  ) {
    return (
      <div className={css.wrapper}>
        <h1 className={css.h1}>
          Unable to proceed: issuedAt type not found for msg_backup_restore
        </h1>
      </div>
    );
  } else if (!signer) {
    return null;
  } else {
    const { explanationStatement, buttonStatement, showTermsAgreement } =
      userTextsForSIWEMessageTypes[siweMessageType];

    let termsOfUseAndPolicyInfo = null;
    if (showTermsAgreement) {
      termsOfUseAndPolicyInfo = (
        <p>
          By signing up, you agree to our{' '}
          <a href="https://comm.app/terms">Terms of Use</a> &{' '}
          <a href="https://comm.app/privacy">Privacy Policy</a>.
        </p>
      );
    }

    const buttonClasses = classnames({
      [css.button]: true,
      [css.disabled]: inProgress,
    });

    return (
      <div className={css.wrapper}>
        <span className={css.walletDisplayText}>
          <p>Wallet Connected</p>
        </span>
        <div className={css.connectedWalletInfo}>
          <ConnectedWalletInfo />
        </div>
        <p>{explanationStatement}</p>
        {termsOfUseAndPolicyInfo}
        <button
          className={buttonClasses}
          onClick={onClick}
          disabled={inProgress}
        >
          {buttonStatement}
        </button>
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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AlchemyENSCacheProvider>
          <RainbowKitProvider theme={theme} modalSize="compact">
            <SIWE />
          </RainbowKitProvider>
        </AlchemyENSCacheProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default SIWEWrapper;
