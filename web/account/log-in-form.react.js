// @flow

import invariant from 'invariant';
import * as React from 'react';

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

import Button from '../components/button.react';
import LoadingIndicator from '../loading-indicator.react';
import Input from '../modals/input.react';
import { useSelector } from '../redux/redux-utils';
import { webLogInExtraInfoSelector } from '../selectors/account-selectors';
import css from './log-in-form.css';
import PasswordInput from './password-input.react';

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);
function LoginForm(): React.Node {
  const inputDisabled = useSelector(loadingStatusSelector) === 'loading';
  const loginExtraInfo = useSelector(webLogInExtraInfoSelector);
  const callLogIn = useServerCall(logIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const modalContext = useModalContext();

  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const usernameInputRef = React.useRef();

  React.useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

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

  return (
    <div className={css['modal-body']}>
      <form method="POST">
        <div>
          <div className={css['form-title']}>Username</div>
          <div className={css['form-content']}>
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
          <div className={css['form-title']}>Password</div>
          <div className={css['form-content']}>
            <PasswordInput
              value={password}
              onChange={onPasswordChange}
              disabled={inputDisabled}
            />
          </div>
        </div>
        <div className={css['form-footer']}>
          <Button
            variant="filled"
            type="submit"
            disabled={inputDisabled}
            onClick={onSubmit}
          >
            {loginButtonContent}
          </Button>
          <div className={css['modal-form-error']}>{errorMessage}</div>
        </div>
      </form>
    </div>
  );
}

export default LoginForm;
