// @flow

import '@rainbow-me/rainbowkit/dist/index.css';

import {
  ConnectButton,
  darkTheme,
  getDefaultWallets,
  RainbowKitProvider,
  useConnectModal,
} from '@rainbow-me/rainbowkit';
import invariant from 'invariant';
import _merge from 'lodash/fp/merge';
import * as React from 'react';
import { FaEthereum } from 'react-icons/fa';
import {
  chain,
  configureChains,
  createClient,
  WagmiConfig,
  useSigner,
} from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
} from 'lib/actions/siwe-actions.js';
import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  oldValidUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils';
import {
  type LogInExtraInfo,
  type LogInStartingPayload,
  logInActionSources,
} from 'lib/types/account-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { isDev } from 'lib/utils/dev-utils.js';

import Button from '../components/button.react';
import LoadingIndicator from '../loading-indicator.react';
import Input from '../modals/input.react';
import { useSelector } from '../redux/redux-utils';
import { webLogInExtraInfoSelector } from '../selectors/account-selectors';
import css from './log-in-form.css';
import PasswordInput from './password-input.react';

// details can be found https://0.6.x.wagmi.sh/docs/providers/configuring-chains
const availableProviders = process.env.COMM_ALCHEMY_KEY
  ? [alchemyProvider({ apiKey: process.env.COMM_ALCHEMY_KEY })]
  : [publicProvider()];
const { chains, provider } = configureChains(
  [chain.mainnet],
  availableProviders,
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

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);
function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const inputDisabled = useSelector(loadingStatusSelector) === 'loading';
  const loginExtraInfo = useSelector(webLogInExtraInfoSelector);
  const callLogIn = useServerCall(logIn);

  const getSIWENonceCall = useServerCall(getSIWENonce);
  const getSIWENonceCallLoadingStatus = useSelector(
    getSIWENonceLoadingStatusSelector,
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const modalContext = useModalContext();

  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [siweNonce, setSIWENonce] = React.useState<?string>(null);

  const usernameInputRef = React.useRef();

  React.useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!signer || !isDev) {
      setSIWENonce(null);
      return;
    }
    dispatchActionPromise(
      getSIWENonceActionTypes,
      (async () => {
        const response = await getSIWENonceCall();
        setSIWENonce(response);
      })(),
    );
  }, [dispatchActionPromise, getSIWENonceCall, signer]);

  const onUsernameChange = React.useCallback(e => {
    invariant(e.target instanceof HTMLInputElement, 'target not input');
    setUsername(e.target.value);
  }, []);

  const onUsernameBlur = React.useCallback(() => {
    setUsername(untrimmedUsername => untrimmedUsername.trim());
  }, []);

  const onPasswordChange = React.useCallback(e => {
    invariant(e.target instanceof HTMLInputElement, 'target not input');
    setPassword(e.target.value);
  }, []);

  const logInAction = React.useCallback(
    async (extraInfo: LogInExtraInfo) => {
      try {
        const result = await callLogIn({
          ...extraInfo,
          username,
          password,
          logInActionSource: logInActionSources.logInFromWebForm,
        });
        modalContext.popModal();
        return result;
      } catch (e) {
        setUsername('');
        setPassword('');
        if (e.message === 'invalid_credentials') {
          setErrorMessage('incorrect username or password');
        } else {
          setErrorMessage('unknown error');
        }
        usernameInputRef.current?.focus();
        throw e;
      }
    },
    [callLogIn, modalContext, password, username],
  );

  const onSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();

      if (username.search(validEmailRegex) > -1) {
        setUsername('');
        setErrorMessage('usernames only, not emails');
        usernameInputRef.current?.focus();
        return;
      } else if (username.search(oldValidUsernameRegex) === -1) {
        setUsername('');
        setErrorMessage('alphanumeric usernames only');
        usernameInputRef.current?.focus();
        return;
      }

      const extraInfo = loginExtraInfo();
      dispatchActionPromise(
        logInActionTypes,
        logInAction(extraInfo),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [dispatchActionPromise, logInAction, loginExtraInfo, username],
  );

  const loginButtonContent = React.useMemo(() => {
    if (inputDisabled) {
      return <LoadingIndicator status="loading" />;
    }
    return 'Log in';
  }, [inputDisabled]);

  const siweButtonColor = React.useMemo(
    () => ({ backgroundColor: 'white', color: 'black' }),
    [],
  );

  let siweSeparator;
  if (isDev) {
    siweSeparator = <hr />;
  }

  let siweConnectButton;
  if (isDev && signer && !siweNonce) {
    siweConnectButton = (
      <div className={css.connectButtonContainer}>
        <LoadingIndicator
          status={getSIWENonceCallLoadingStatus}
          size="medium"
        />
      </div>
    );
  } else if (isDev && signer) {
    siweConnectButton = (
      <div className={css.connectButtonContainer}>
        <ConnectButton />
      </div>
    );
  }

  const onSIWEButtonClick = React.useCallback(() => {
    openConnectModal && openConnectModal();
  }, [openConnectModal]);

  let siweButton;
  if (isDev && openConnectModal) {
    siweButton = (
      <>
        <Button
          onClick={onSIWEButtonClick}
          variant="filled"
          buttonColor={siweButtonColor}
        >
          <div className={css.ethereum_logo_container}>
            <FaEthereum />
          </div>
          Sign in with Ethereum
        </Button>
      </>
    );
  }

  return (
    <div className={css.modal_body}>
      <form method="POST">
        <div>
          <div className={css.form_title}>Username</div>
          <div className={css.form_content}>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={onUsernameChange}
              onBlur={onUsernameBlur}
              ref={usernameInputRef}
              disabled={inputDisabled}
            />
          </div>
        </div>
        <div>
          <div className={css.form_title}>Password</div>
          <div className={css.form_content}>
            <PasswordInput
              value={password}
              onChange={onPasswordChange}
              disabled={inputDisabled}
            />
          </div>
        </div>
        <div className={css.form_footer}>
          <Button
            variant="filled"
            type="submit"
            disabled={inputDisabled}
            onClick={onSubmit}
          >
            {loginButtonContent}
          </Button>
          {siweSeparator}
          {siweConnectButton}
          {siweButton}
          <div className={css.modal_form_error}>{errorMessage}</div>
        </div>
      </form>
    </div>
  );
}

function LoginFormWrapper(): React.Node {
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
      <RainbowKitProvider chains={chains} theme={theme} modalSize="compact">
        <LoginForm />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default LoginFormWrapper;
