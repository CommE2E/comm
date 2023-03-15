// @flow

import '@rainbow-me/rainbowkit/styles.css';
import invariant from 'invariant';
import * as React from 'react';
import { useAccount, useSigner } from 'wagmi';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  siweAuth,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import ConnectedWalletInfo from 'lib/components/connected-wallet-info.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import type {
  OLMIdentityKeys,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import {
  createSIWEMessage,
  getSIWEStatementForPublicKey,
  siweMessageSigningExplanationStatements,
} from 'lib/utils/siwe-utils.js';

import HeaderSeparator from './header-separator.react.js';
import css from './siwe.css';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { webLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import { getSignedIdentityKeysBlobSelector } from '../selectors/socket-selectors.js';

type SIWELoginFormProps = {
  +cancelSIWEAuthFlow: () => void,
};

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
function SIWELoginForm(props: SIWELoginFormProps): React.Node {
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

  const siweNonceShouldBeFetched =
    !siweNonce && getSIWENonceCallLoadingStatus !== 'loading';

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

  const primaryIdentityPublicKeys: ?OLMIdentityKeys = useSelector(
    state => state.cryptoStore.primaryIdentityKeys,
  );

  const getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob> =
    useSelector(getSignedIdentityKeysBlobSelector);

  const [signedIdentityKeysBlob, setSignedIdentityKeysBlob] =
    React.useState<?SignedIdentityKeysBlob>(null);

  React.useEffect(() => {
    (async () => {
      if (
        getSignedIdentityKeysBlob === null ||
        getSignedIdentityKeysBlob === undefined
      ) {
        setSignedIdentityKeysBlob(null);
        return;
      }
      const resolvedSignedIdentityKeysBlob: SignedIdentityKeysBlob =
        await getSignedIdentityKeysBlob();
      setSignedIdentityKeysBlob(resolvedSignedIdentityKeysBlob);
    })();
  }, [getSignedIdentityKeysBlob]);

  const callSIWEAuthEndpoint = React.useCallback(
    (message: string, signature: string, extraInfo) => {
      invariant(
        signedIdentityKeysBlob,
        'signedIdentityKeysBlob must be set in attemptSIWEAuth',
      );
      return siweAuthCall({
        message,
        signature,
        signedIdentityKeysBlob,
        ...extraInfo,
      });
    },
    [signedIdentityKeysBlob, siweAuthCall],
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
    const signature = await signer.signMessage(message);
    attemptSIWEAuth(message, signature);
  }, [address, attemptSIWEAuth, primaryIdentityPublicKeys, signer, siweNonce]);

  const { cancelSIWEAuthFlow } = props;

  const backButtonColor = React.useMemo(
    () => ({ backgroundColor: '#211E2D' }),
    [],
  );

  const signInButtonColor = React.useMemo(
    () => ({ backgroundColor: '#6A20E3' }),
    [],
  );

  if (!siweNonce || !primaryIdentityPublicKeys || !signedIdentityKeysBlob) {
    return (
      <div className={css.loadingIndicator}>
        <LoadingIndicator status="loading" size="large" />
      </div>
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
