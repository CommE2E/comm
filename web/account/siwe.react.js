// @flow

import '@rainbow-me/rainbowkit/dist/index.css';

import olm from '@matrix-org/olm';
import {
  ConnectButton,
  darkTheme,
  RainbowKitProvider,
  useConnectModal,
} from '@rainbow-me/rainbowkit';
import invariant from 'invariant';
import _merge from 'lodash/fp/merge';
import * as React from 'react';
import { FaEthereum } from 'react-icons/fa';
import { useAccount, useSigner } from 'wagmi';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  siweAuth,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import {
  createSIWEMessage,
  getSIWEStatementForPublicKey,
  siweMessageSigningExplanationStatements,
} from 'lib/utils/siwe-utils.js';

import Button from '../components/button.react';
import LoadingIndicator from '../loading-indicator.react';
import { useSelector } from '../redux/redux-utils';
import { webLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import { wagmiChains } from '../utils/wagmi-utils';
import css from './siwe.css';

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
function SIWE(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { address } = useAccount();
  const { data: signer } = useSigner();
  const dispatchActionPromise = useDispatchActionPromise();
  const getSIWENonceCall = useServerCall(getSIWENonce);
  const getSIWENonceCallLoadingStatus = useSelector(
    getSIWENonceLoadingStatusSelector,
  );
  const siweAuthCall = useServerCall(siweAuth);
  const logInExtraInfo = useSelector(webLogInExtraInfoSelector);

  const [siweNonce, setSIWENonce] = React.useState<?string>(null);
  const [
    primaryIdentityPublicKey,
    setPrimaryIdentityPublicKey,
  ] = React.useState<?string>(null);
  const [
    hasSIWEButtonBeenClicked,
    setHasSIWEButtonBeenClicked,
  ] = React.useState<boolean>(false);

  const siweNonceShouldBeFetched =
    !siweNonce &&
    getSIWENonceCallLoadingStatus !== 'loading' &&
    (signer || hasSIWEButtonBeenClicked);

  React.useEffect(() => {
    if (!siweNonceShouldBeFetched) {
      return;
    }
    dispatchActionPromise(
      getSIWENonceActionTypes,
      (async () => {
        const response = await getSIWENonceCall();
        setSIWENonce(response);
      })(),
    );
  }, [dispatchActionPromise, getSIWENonceCall, siweNonceShouldBeFetched]);

  React.useEffect(() => {
    (async () => {
      await olm.init();
      const account = new olm.Account();
      account.create();
      const { ed25519 } = JSON.parse(account.identity_keys());
      setPrimaryIdentityPublicKey(ed25519);
    })();
  }, []);

  const siweButtonColor = React.useMemo(
    () => ({ backgroundColor: 'white', color: 'black' }),
    [],
  );

  const callSIWEAuthEndpoint = React.useCallback(
    (message: string, signature: string, extraInfo) =>
      siweAuthCall({
        message,
        signature,
        ...extraInfo,
      }),
    [siweAuthCall],
  );

  const attemptSIWEAuth = React.useCallback(
    (message: string, signature: string) => {
      const extraInfo = logInExtraInfo();
      dispatchActionPromise(
        siweAuthActionTypes,
        callSIWEAuthEndpoint(message, signature, extraInfo),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [callSIWEAuthEndpoint, dispatchActionPromise, logInExtraInfo],
  );

  const onSignInButtonClick = React.useCallback(async () => {
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    invariant(
      primaryIdentityPublicKey,
      'primaryIdentityPublicKey must be present during SIWE attempt',
    );
    const statement = getSIWEStatementForPublicKey(primaryIdentityPublicKey);
    const message = createSIWEMessage(address, statement, siweNonce);
    const signature = await signer.signMessage(message);
    attemptSIWEAuth(message, signature);
  }, [address, attemptSIWEAuth, primaryIdentityPublicKey, signer, siweNonce]);

  let siweLoginForm;
  if (signer && (!siweNonce || !primaryIdentityPublicKey)) {
    siweLoginForm = (
      <div className={css.connectButtonContainer}>
        <LoadingIndicator status="loading" size="medium" />
      </div>
    );
  } else if (signer) {
    siweLoginForm = (
      <div className={css.siweLoginFormContainer}>
        <div className={css.connectButtonContainer}>
          <ConnectButton />
        </div>
        <p>{siweMessageSigningExplanationStatements[0]}</p>
        <p>{siweMessageSigningExplanationStatements[1]}</p>
        <p>
          By signing up, you agree to our{' '}
          <a href="https://comm.app/terms">Terms of Use</a> &{' '}
          <a href="https://comm.app/privacy">Privacy Policy</a>.
        </p>
        <Button variant="filled" onClick={onSignInButtonClick}>
          Sign in
        </Button>
      </div>
    );
  }

  const onSIWEButtonClick = React.useCallback(() => {
    setHasSIWEButtonBeenClicked(true);
    openConnectModal && openConnectModal();
  }, [openConnectModal]);

  let siweButton;
  if (openConnectModal) {
    siweButton = (
      <>
        <Button
          onClick={onSIWEButtonClick}
          variant="filled"
          buttonColor={siweButtonColor}
        >
          <div className={css.ethereumLogoContainer}>
            <FaEthereum />
          </div>
          Sign in with Ethereum
        </Button>
      </>
    );
  }
  return (
    <div className={css.siweContainer}>
      <hr />
      {siweLoginForm}
      {siweButton}
    </div>
  );
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
    <RainbowKitProvider chains={wagmiChains} theme={theme} modalSize="compact">
      <SIWE />
    </RainbowKitProvider>
  );
}

export default SIWEWrapper;
