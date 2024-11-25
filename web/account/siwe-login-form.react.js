// @flow

import '@rainbow-me/rainbowkit/styles.css';
import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { useAccount, useWalletClient } from 'wagmi';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import {
  getSIWENonce,
  getSIWENonceActionTypes,
  legacySiweAuth,
  legacySiweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import {
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
} from 'lib/actions/user-actions.js';
import ConnectedWalletInfo from 'lib/components/connected-wallet-info.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import stores from 'lib/facts/stores.js';
import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { legacyLogInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  LegacyLogInStartingPayload,
  LegacyLogInExtraInfo,
} from 'lib/types/account-types.js';
import { SIWEMessageTypes } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';
import {
  createSIWEMessage,
  getSIWEStatementForPublicKey,
  siweMessageSigningExplanationStatements,
} from 'lib/utils/siwe-utils.js';

import HeaderSeparator from './header-separator.react.js';
import css from './siwe.css';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import { olmAPI } from '../crypto/olm-api.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { getVersionUnsupportedError } from '../utils/version-utils.js';

type SIWELogInError =
  | 'account_does_not_exist'
  | 'client_version_unsupported'
  | 'retry_from_native';

type SIWELoginFormProps = {
  +cancelSIWEAuthFlow: () => void,
};

const legacyGetSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const identityGenerateNonceLoadingStatusSelector = createLoadingStatusSelector(
  identityGenerateNonceActionTypes,
);
const legacySiweAuthLoadingStatusSelector = createLoadingStatusSelector(
  legacySiweAuthActionTypes,
);
function SIWELoginForm(props: SIWELoginFormProps): React.Node {
  const { address } = useAccount();
  const { data: signer } = useWalletClient();
  const dispatchActionPromise = useDispatchActionPromise();
  const legacyGetSIWENonceCall = useLegacyAshoatKeyserverCall(getSIWENonce);
  const legacyGetSIWENonceCallLoadingStatus = useSelector(
    legacyGetSIWENonceLoadingStatusSelector,
  );
  const identityGenerateNonce = useIdentityGenerateNonce();
  const identityGenerateNonceLoadingStatus = useSelector(
    identityGenerateNonceLoadingStatusSelector,
  );
  const siweAuthLoadingStatus = useSelector(
    legacySiweAuthLoadingStatusSelector,
  );
  const legacySiweAuthCall = useLegacyAshoatKeyserverCall(legacySiweAuth);
  const legacyLogInExtraInfo = useSelector(legacyLogInExtraInfoSelector);

  const walletLogIn = useWalletLogIn();

  const [siweNonce, setSIWENonce] = React.useState<?string>(null);

  const siweNonceShouldBeFetched =
    !siweNonce &&
    legacyGetSIWENonceCallLoadingStatus !== 'loading' &&
    identityGenerateNonceLoadingStatus !== 'loading';

  React.useEffect(() => {
    if (!siweNonceShouldBeFetched) {
      return;
    }
    if (usingCommServicesAccessToken) {
      void dispatchActionPromise(
        identityGenerateNonceActionTypes,
        (async () => {
          const response = await identityGenerateNonce();
          setSIWENonce(response);
        })(),
      );
    } else {
      void dispatchActionPromise(
        getSIWENonceActionTypes,
        (async () => {
          const response = await legacyGetSIWENonceCall();
          setSIWENonce(response);
        })(),
      );
    }
  }, [
    dispatchActionPromise,
    identityGenerateNonce,
    legacyGetSIWENonceCall,
    siweNonceShouldBeFetched,
  ]);

  const callLegacySIWEAuthEndpoint = React.useCallback(
    async (
      message: string,
      signature: string,
      extraInfo: LegacyLogInExtraInfo,
    ) => {
      await olmAPI.initializeCryptoAccount();
      const userPublicKey = await olmAPI.getUserPublicKey();
      try {
        return await legacySiweAuthCall({
          message,
          signature,
          signedIdentityKeysBlob: {
            payload: userPublicKey.blobPayload,
            signature: userPublicKey.signature,
          },
          doNotRegister: true,
          ...extraInfo,
        });
      } catch (e) {
        const messageForException = getMessageForException(e);
        if (messageForException === 'account_does_not_exist') {
          setError('account_does_not_exist');
        } else if (messageForException === 'client_version_unsupported') {
          setError('client_version_unsupported');
        }
        throw e;
      }
    },
    [legacySiweAuthCall],
  );

  const attemptLegacySIWEAuth = React.useCallback(
    (message: string, signature: string) => {
      return dispatchActionPromise(
        legacySiweAuthActionTypes,
        callLegacySIWEAuthEndpoint(message, signature, legacyLogInExtraInfo),
        undefined,
        ({
          calendarQuery: legacyLogInExtraInfo.calendarQuery,
        }: LegacyLogInStartingPayload),
      );
    },
    [callLegacySIWEAuthEndpoint, dispatchActionPromise, legacyLogInExtraInfo],
  );

  const attemptWalletLogIn = React.useCallback(
    async (
      walletAddress: string,
      siweMessage: string,
      siweSignature: string,
    ) => {
      try {
        await walletLogIn(walletAddress, siweMessage, siweSignature);
      } catch (e) {
        const messageForException = getMessageForException(e);
        if (messageForException === 'user_not_found') {
          setError('account_does_not_exist');
        } else if (
          messageForException === 'client_version_unsupported' ||
          messageForException === 'unsupported_version' ||
          messageForException === 'use_new_flow'
        ) {
          setError('client_version_unsupported');
        } else if (messageForException === 'retry_from_native') {
          setError('retry_from_native');
        }
      }
    },
    [walletLogIn],
  );

  const dispatch = useDispatch();
  const onSignInButtonClick = React.useCallback(async () => {
    invariant(signer, 'signer must be present during SIWE attempt');
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    await olmAPI.initializeCryptoAccount();
    const {
      primaryIdentityPublicKeys: { ed25519 },
    } = await olmAPI.getUserPublicKey();
    const statement = getSIWEStatementForPublicKey(
      ed25519,
      SIWEMessageTypes.MSG_AUTH,
    );
    const message = createSIWEMessage(address, statement, siweNonce);
    let signature;
    try {
      signature = await signer.signMessage({ message });
    } catch (e) {
      // If we fail to get the signature (e.g. user cancels the request), we
      // should return immediately
      return;
    }
    if (usingCommServicesAccessToken) {
      await attemptWalletLogIn(address, message, signature);
    } else {
      await attemptLegacySIWEAuth(message, signature);
      dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
    }
  }, [
    address,
    attemptLegacySIWEAuth,
    attemptWalletLogIn,
    signer,
    siweNonce,
    dispatch,
  ]);

  const { cancelSIWEAuthFlow } = props;

  const backButtonColor = React.useMemo(
    () => ({ backgroundColor: '#211E2D' }),
    [],
  );

  const signInButtonColor = React.useMemo(
    () => ({ backgroundColor: '#6A20E3' }),
    [],
  );

  const [error, setError] = React.useState<?SIWELogInError>();

  const mainMiddleAreaClassName = classNames({
    [css.mainMiddleArea]: true,
    [css.hidden]: !!error,
  });
  const errorOverlayClassNames = classNames({
    [css.errorOverlay]: true,
    [css.hidden]: !error,
  });

  if (siweAuthLoadingStatus === 'loading' || !siweNonce) {
    return (
      <div className={css.loadingIndicator}>
        <LoadingIndicator status="loading" size="large" />
      </div>
    );
  }

  let errorText;
  if (error === 'account_does_not_exist') {
    errorText = (
      <>
        <p className={css.redText}>
          No Comm account found for that Ethereum wallet!
        </p>
        <p>
          We require that users register on their mobile devices. Comm relies on
          a primary device capable of scanning QR codes in order to authorize
          secondary devices.
        </p>
        <p>
          You can install our iOS app&nbsp;
          <a href={stores.appStoreUrl} target="_blank" rel="noreferrer">
            here
          </a>
          , or our Android app&nbsp;
          <a href={stores.googlePlayUrl} target="_blank" rel="noreferrer">
            here
          </a>
          .
        </p>
      </>
    );
  } else if (error === 'client_version_unsupported') {
    errorText = <p className={css.redText}>{getVersionUnsupportedError()}</p>;
  } else if (error === 'retry_from_native') {
    errorText = (
      <>
        <p className={css.redText}>
          No primary device found for that Ethereum wallet!
        </p>
        <p>
          Please try logging in from a mobile device to establish your primary
          device. Comm relies on a primary device capable of scanning QR codes
          in order to authorize secondary devices. Once you&rsquo;ve logged in
          from a mobile device, you will be able to log in from your browser.
        </p>
        <p>
          You can install our iOS app&nbsp;
          <a href={stores.appStoreUrl} target="_blank" rel="noreferrer">
            here
          </a>
          , or our Android app&nbsp;
          <a href={stores.googlePlayUrl} target="_blank" rel="noreferrer">
            here
          </a>
          .
        </p>
      </>
    );
  }

  return (
    <div className={css.siweLoginFormContainer}>
      <h4>Sign in with Ethereum</h4>
      <HeaderSeparator />
      <div className={css.walletConnectedText}>
        <p>Wallet Connected</p>
      </div>
      <div className={css.connectButtonContainer}>
        <ConnectedWalletInfo />
      </div>
      <div className={css.middleArea}>
        <div className={mainMiddleAreaClassName}>
          <div className={css.messageSigningStatements}>
            <p>{siweMessageSigningExplanationStatements}</p>
            <p>
              By signing up, you agree to our{' '}
              <a href="https://comm.app/terms">Terms of Use</a> &{' '}
              <a href="https://comm.app/privacy">Privacy Policy</a>.
            </p>
          </div>
          <Button
            variant="filled"
            onClick={onSignInButtonClick}
            buttonColor={signInButtonColor}
          >
            Sign in using this wallet
          </Button>
        </div>
        <div className={errorOverlayClassNames}>{errorText}</div>
      </div>
      <OrBreak />
      <Button
        variant="filled"
        onClick={cancelSIWEAuthFlow}
        buttonColor={backButtonColor}
      >
        <SWMansionIcon icon="chevron-left" size={18} />
        Back to sign in with username
      </Button>
    </div>
  );
}

export default SIWELoginForm;
