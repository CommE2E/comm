// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { oldValidUsernameRegex } from 'lib/shared/account-utils';
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
  +usernameOrEmail: string,
  +password: string,
  +errorMessage: string,
|};
class LogInModal extends React.PureComponent<Props, State> {
  usernameOrEmailInput: ?HTMLInputElement;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      usernameOrEmail: '',
      password: '',
      errorMessage: '',
    };
  }

  componentDidMount() {
    invariant(this.usernameOrEmailInput, 'usernameOrEmail ref unset');
    this.usernameOrEmailInput.focus();
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
                  value={this.state.usernameOrEmail}
                  onChange={this.onChangeUsernameOrEmail}
                  ref={this.usernameOrEmailInputRef}
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

  usernameOrEmailInputRef = (usernameOrEmailInput: ?HTMLInputElement) => {
    this.usernameOrEmailInput = usernameOrEmailInput;
  };

  passwordInputRef = (passwordInput: ?HTMLInputElement) => {
    this.passwordInput = passwordInput;
  };

  onChangeUsernameOrEmail = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ usernameOrEmail: target.value });
  };

  onChangePassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ password: target.value });
  };

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.usernameOrEmail.search(oldValidUsernameRegex) === -1) {
      this.setState(
        {
          usernameOrEmail: '',
          errorMessage: 'alphanumeric usernames only',
        },
        () => {
          invariant(
            this.usernameOrEmailInput,
            'usernameOrEmailInput ref unset',
          );
          this.usernameOrEmailInput.focus();
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
        username: this.state.usernameOrEmail,
        password: this.state.password,
        ...extraInfo,
      });
      this.clearModal();
      return result;
    } catch (e) {
      if (e.message === 'invalid_parameters') {
        this.setState(
          {
            usernameOrEmail: '',
            errorMessage: "user doesn't exist",
          },
          () => {
            invariant(
              this.usernameOrEmailInput,
              'usernameOrEmailInput ref unset',
            );
            this.usernameOrEmailInput.focus();
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
            usernameOrEmail: '',
            password: '',
            errorMessage: 'unknown error',
          },
          () => {
            invariant(
              this.usernameOrEmailInput,
              'usernameOrEmailInput ref unset',
            );
            this.usernameOrEmailInput.focus();
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

export default React.memo<BaseProps>(function ConnectedLoginModal(
  props: BaseProps,
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
