// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  validEmailRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils';
import type {
  LogInInfo,
  LogInExtraInfo,
  LogInResult,
  LogInStartingPayload,
} from 'lib/types/account-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { useSelector } from '../../redux/redux-utils';
import { webLogInExtraInfoSelector } from '../../selectors/account-selectors';
import css from '../../style.css';
import Modal from '../modal.react';

type BaseProps = {|
  +setModal: (modal: ?React.Node) => void,
|};
type Props = {|
  ...BaseProps,
  +inputDisabled: boolean,
  +logInExtraInfo: () => LogInExtraInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +logIn: (logInInfo: LogInInfo) => Promise<LogInResult>,
|};
type State = {|
  +username: string,
  +password: string,
  +errorMessage: string,
|};
class LogInModal extends React.PureComponent<Props, State> {
  usernameInput: ?HTMLInputElement;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errorMessage: '',
    };
  }

  componentDidMount() {
    invariant(this.usernameInput, 'username ref unset');
    this.usernameInput.focus();
  }

  render() {
    return (
      <Modal name="Log in" onClose={this.clearModal}>
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  placeholder="Username"
                  value={this.state.username}
                  onChange={this.onChangeUsername}
                  ref={this.usernameInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            <div>
              <div className={css['form-title']}>Password</div>
              <div className={css['form-content']}>
                <input
                  type="password"
                  placeholder="Password"
                  value={this.state.password}
                  onChange={this.onChangePassword}
                  ref={this.passwordInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <input
                type="submit"
                value="Log in"
                onClick={this.onSubmit}
                disabled={this.props.inputDisabled}
              />
              <div className={css['modal-form-error']}>
                {this.state.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  usernameInputRef = (usernameInput: ?HTMLInputElement) => {
    this.usernameInput = usernameInput;
  };

  passwordInputRef = (passwordInput: ?HTMLInputElement) => {
    this.passwordInput = passwordInput;
  };

  onChangeUsername = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ username: target.value });
  };

  onChangePassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ password: target.value });
  };

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.username.search(validEmailRegex) > -1) {
      this.setState(
        {
          username: '',
          errorMessage: 'usernames only, not emails',
        },
        () => {
          invariant(this.usernameInput, 'usernameInput ref unset');
          this.usernameInput.focus();
        },
      );
      return;
    } else if (this.state.username.search(oldValidUsernameRegex) === -1) {
      this.setState(
        {
          username: '',
          errorMessage: 'alphanumeric usernames only',
        },
        () => {
          invariant(this.usernameInput, 'usernameInput ref unset');
          this.usernameInput.focus();
        },
      );
      return;
    }

    const extraInfo = this.props.logInExtraInfo();
    this.props.dispatchActionPromise(
      logInActionTypes,
      this.logInAction(extraInfo),
      undefined,
      ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
    );
  };

  async logInAction(extraInfo: LogInExtraInfo) {
    try {
      const result = await this.props.logIn({
        username: this.state.username,
        password: this.state.password,
        ...extraInfo,
      });
      this.clearModal();
      return result;
    } catch (e) {
      if (e.message === 'invalid_parameters') {
        this.setState(
          {
            username: '',
            errorMessage: "user doesn't exist",
          },
          () => {
            invariant(this.usernameInput, 'usernameInput ref unset');
            this.usernameInput.focus();
          },
        );
      } else if (e.message === 'invalid_credentials') {
        this.setState(
          {
            password: '',
            errorMessage: 'wrong password',
          },
          () => {
            invariant(this.passwordInput, 'passwordInput ref unset');
            this.passwordInput.focus();
          },
        );
      } else {
        this.setState(
          {
            username: '',
            password: '',
            errorMessage: 'unknown error',
          },
          () => {
            invariant(this.usernameInput, 'usernameInput ref unset');
            this.usernameInput.focus();
          },
        );
      }
      throw e;
    }
  }

  clearModal = () => {
    this.props.setModal(null);
  };
}

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);

const ConnectedLoginModal: React.AbstractComponent<BaseProps, mixed> = React.memo<BaseProps>(function ConnectedLoginModal(
  props
) {
  const inputDisabled = useSelector(loadingStatusSelector) === 'loading';
  const loginExtraInfo = useSelector(webLogInExtraInfoSelector);
  const callLogIn = useServerCall(logIn);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <LogInModal
      {...props}
      inputDisabled={inputDisabled}
      logInExtraInfo={loginExtraInfo}
      logIn={callLogIn}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});

export default ConnectedLoginModal;
