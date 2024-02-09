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
  siweAuth,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import {
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
} from 'lib/actions/user-actions.js';
import ConnectedWalletInfo from 'lib/components/connected-wallet-info.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import stores from 'lib/facts/stores.js';
import { logInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  LogInStartingPayload,
  LogInExtraInfo,
} from 'lib/types/account-types.js';
import type { OLMIdentityKeys } from 'lib/types/crypto-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';
import {
  createSIWEMessage,
  getSIWEStatementForPublicKey,
  siweMessageSigningExplanationStatements,
} from 'lib/utils/siwe-utils.js';

import { useGetSignedIdentityKeysBlob } from './account-hooks.js';
import HeaderSeparator from './header-separator.react.js';
import css from './siwe.css';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';

type SIWELogInError = 'account_does_not_exist';

type SIWELoginFormProps = {
  +cancelSIWEAuthFlow: () => void,
};

const legacyGetSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const identityGenerateNonceLoadingStatusSelector = createLoadingStatusSelector(
  identityGenerateNonceActionTypes,
);
const legacySiweAuthLoadingStatusSelector =
  createLoadingStatusSelector(siweAuthActionTypes);
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
  const legacySiweAuthCall = useLegacyAshoatKeyserverCall(siweAuth);
  const logInExtraInfo = useSelector(logInExtraInfoSelector);

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

  const primaryIdentityPublicKeys: ?OLMIdentityKeys = useSelector(
    state => state.cryptoStore?.primaryIdentityKeys,
  );

  const getSignedIdentityKeysBlob = useGetSignedIdentityKeysBlob();

  const callLegacySIWEAuthEndpoint = React.useCallback(
    async (message: string, signature: string, extraInfo: LogInExtraInfo) => {
      const signedIdentityKeysBlob = await getSignedIdentityKeysBlob();
      invariant(
        signedIdentityKeysBlob,
        'signedIdentityKeysBlob must be set in attemptSIWEAuth',
      );
      try {
        return await legacySiweAuthCall({
          message,
          signature,
          signedIdentityKeysBlob,
          doNotRegister: true,
          ...extraInfo,
        });
      } catch (e) {
        if (
          e instanceof ServerError &&
          e.message === 'account_does_not_exist'
        ) {
          setError('account_does_not_exist');
        }
        throw e;
      }
    },
    [getSignedIdentityKeysBlob, legacySiweAuthCall],
  );

  const attemptLegacySIWEAuth = React.useCallback(
    (message: string, signature: string) => {
      return dispatchActionPromise(
        siweAuthActionTypes,
        callLegacySIWEAuthEndpoint(message, signature, logInExtraInfo),
        undefined,
        ({ calendarQuery: logInExtraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [callLegacySIWEAuthEndpoint, dispatchActionPromise, logInExtraInfo],
  );

  const dispatch = useDispatch();
  const onSignInButtonClick = React.useCallback(async () => {
    invariant(signer, 'signer must be present during SIWE attempt');
    invariant(siweNonce, 'nonce must be present during SIWE attempt');
    invariant(
      primaryIdentityPublicKeys,
      'primaryIdentityPublicKeys must be present during SIWE attempt',
    );
    const statement = getSIWEStatementForPublicKey(
      primaryIdentityPublicKeys.ed25519,
    );
    const message = createSIWEMessage(address, statement, siweNonce);
    const signature = await signer.signMessage({ message });
    await attemptLegacySIWEAuth(message, signature);
    dispatch({
      type: setDataLoadedActionType,
      payload: {
        dataLoaded: true,
      },
    });
  }, [
    address,
    attemptLegacySIWEAuth,
    primaryIdentityPublicKeys,
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

  if (
    siweAuthLoadingStatus === 'loading' ||
    !siweNonce ||
    !primaryIdentityPublicKeys
  ) {
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
