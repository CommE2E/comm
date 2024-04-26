// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  useLegacyLogIn,
  legacyLogInActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
import { legacyLogInExtraInfoSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  oldValidUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils.js';
import type {
  LegacyLogInExtraInfo,
  LegacyLogInStartingPayload,
} from 'lib/types/account-types.js';
import { logInActionSources } from 'lib/types/account-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import HeaderSeparator from './header-separator.react.js';
import css from './log-in-form.css';
import PasswordInput from './password-input.react.js';
import Button from '../components/button.react.js';
import { olmAPI } from '../crypto/olm-api.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Input from '../modals/input.react.js';
import { useSelector } from '../redux/redux-utils.js';

const loadingStatusSelector = createLoadingStatusSelector(
  legacyLogInActionTypes,
);
function TraditionalLoginForm(): React.Node {
  const legacyAuthInProgress = useSelector(loadingStatusSelector) === 'loading';
  const [identityAuthInProgress, setIdentityAuthInProgress] =
    React.useState(false);
  const inputDisabled = legacyAuthInProgress || identityAuthInProgress;

  const legacyLoginExtraInfo = useSelector(legacyLogInExtraInfoSelector);
  const callLegacyLogIn = useLegacyLogIn();

  const dispatchActionPromise = useDispatchActionPromise();
  const modalContext = useModalContext();

  const usernameInputRef = React.useRef<?HTMLInputElement>();
  React.useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  const [username, setUsername] = React.useState<string>('');
  const onUsernameChange = React.useCallback(
    (e: SyntheticEvent<HTMLInputElement>) => {
      invariant(e.target instanceof HTMLInputElement, 'target not input');
      setUsername(e.target.value);
    },
    [],
  );

  const onUsernameBlur = React.useCallback(() => {
    setUsername(untrimmedUsername => untrimmedUsername.trim());
  }, []);

  const [password, setPassword] = React.useState<string>('');
  const onPasswordChange = React.useCallback(
    (e: SyntheticEvent<HTMLInputElement>) => {
      invariant(e.target instanceof HTMLInputElement, 'target not input');
      setPassword(e.target.value);
    },
    [],
  );

  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const legacyLogInAction = React.useCallback(
    async (extraInfo: LegacyLogInExtraInfo) => {
      await olmAPI.initializeCryptoAccount();
      const userPublicKey = await olmAPI.getUserPublicKey();
      try {
        const result = await callLegacyLogIn({
          ...extraInfo,
          username,
          password,
          authActionSource: logInActionSources.logInFromWebForm,
          signedIdentityKeysBlob: {
            payload: userPublicKey.blobPayload,
            signature: userPublicKey.signature,
          },
        });
        modalContext.popModal();
        return result;
      } catch (e) {
        setUsername('');
        setPassword('');
        if (getMessageForException(e) === 'invalid_credentials') {
          setErrorMessage('incorrect username or password');
        } else {
          setErrorMessage('unknown error');
        }
        usernameInputRef.current?.focus();
        throw e;
      }
    },
    [callLegacyLogIn, modalContext, password, username],
  );

  const callIdentityPasswordLogIn = usePasswordLogIn();

  const identityPasswordLogInAction = React.useCallback(async () => {
    if (identityAuthInProgress) {
      return;
    }
    setIdentityAuthInProgress(true);
    try {
      await callIdentityPasswordLogIn(username, password);
      modalContext.popModal();
    } catch (e) {
      setUsername('');
      setPassword('');
      const messageForException = getMessageForException(e);
      if (
        messageForException === 'user not found' ||
        messageForException === 'login failed'
      ) {
        setErrorMessage('incorrect username or password');
      } else {
        setErrorMessage('unknown error');
      }
      usernameInputRef.current?.focus();
      throw e;
    } finally {
      setIdentityAuthInProgress(false);
    }
  }, [
    identityAuthInProgress,
    callIdentityPasswordLogIn,
    modalContext,
    password,
    username,
  ]);

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
      } else if (password === '') {
        setErrorMessage('password is empty');
        usernameInputRef.current?.focus();
        return;
      }
      if (usingCommServicesAccessToken) {
        void identityPasswordLogInAction();
      } else {
        void dispatchActionPromise(
          legacyLogInActionTypes,
          legacyLogInAction(legacyLoginExtraInfo),
          undefined,
          ({
            calendarQuery: legacyLoginExtraInfo.calendarQuery,
          }: LegacyLogInStartingPayload),
        );
      }
    },
    [
      dispatchActionPromise,
      identityPasswordLogInAction,
      legacyLogInAction,
      legacyLoginExtraInfo,
      username,
      password,
    ],
  );

  const loginButtonContent = React.useMemo(() => {
    if (inputDisabled) {
      return <LoadingIndicator status="loading" />;
    }
    return 'Sign in';
  }, [inputDisabled]);

  const signInButtonColor = React.useMemo(
    () => ({ backgroundColor: '#6A20E3' }),
    [],
  );

  return (
    <form method="POST">
      <div>
        <h4>Sign in to Comm</h4>
        <HeaderSeparator />
        <div className={css.form_title}>Username</div>
        <div className={css.form_content}>
          <Input
            className={css.input}
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
            className={css.input}
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
          buttonColor={signInButtonColor}
        >
          {loginButtonContent}
        </Button>
        <div className={css.modal_form_error}>{errorMessage}</div>
      </div>
    </form>
  );
}

export default TraditionalLoginForm;
