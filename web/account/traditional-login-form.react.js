// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logIn, logInActionTypes } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  oldValidUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils.js';
import type {
  LogInExtraInfo,
  LogInStartingPayload,
} from 'lib/types/account-types.js';
import { logInActionSources } from 'lib/types/account-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import Button from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Input from '../modals/input.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { webLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import css from './log-in-form.css';
import PasswordInput from './password-input.react.js';

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);
function TraditionalLoginForm(): React.Node {
  const inputDisabled = useSelector(loadingStatusSelector) === 'loading';
  const loginExtraInfo = useSelector(webLogInExtraInfoSelector);
  const callLogIn = useServerCall(logIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const modalContext = useModalContext();

  const usernameInputRef = React.useRef();
  React.useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  const [username, setUsername] = React.useState<string>('');
  const onUsernameChange = React.useCallback(e => {
    invariant(e.target instanceof HTMLInputElement, 'target not input');
    setUsername(e.target.value);
  }, []);

  const onUsernameBlur = React.useCallback(() => {
    setUsername(untrimmedUsername => untrimmedUsername.trim());
  }, []);

  const [password, setPassword] = React.useState<string>('');
  const onPasswordChange = React.useCallback(e => {
    invariant(e.target instanceof HTMLInputElement, 'target not input');
    setPassword(e.target.value);
  }, []);

  const [errorMessage, setErrorMessage] = React.useState<string>('');

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
      } else if (password === '') {
        setErrorMessage('password is empty');
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
    [dispatchActionPromise, logInAction, loginExtraInfo, username, password],
  );

  const loginButtonContent = React.useMemo(() => {
    if (inputDisabled) {
      return <LoadingIndicator status="loading" />;
    }
    return 'Log in';
  }, [inputDisabled]);

  return (
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
        <div className={css.modal_form_error}>{errorMessage}</div>
      </div>
    </form>
  );
}

export default TraditionalLoginForm;
