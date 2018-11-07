// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type {
  RegisterInfo,
  LogInExtraInfo,
  RegisterResult,
  LogInStartingPayload,
} from 'lib/types/account-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import { connect } from 'lib/utils/redux-utils';
import { registerActionTypes, register } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import VerifyEmailModal from './verify-email-modal.react';
import { webLogInExtraInfoSelector } from '../../selectors/account-selectors';

type Props = {
  setModal: (modal: ?React.Node) => void,
  // Redux state
  inputDisabled: bool,
  logInExtraInfo: () => LogInExtraInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  register: (registerInfo: RegisterInfo) => Promise<RegisterResult>,
};
type State = {
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
  errorMessage: string,
};

class RegisterModal extends React.PureComponent<Props, State> {

  usernameInput: ?HTMLInputElement;
  emailInput: ?HTMLInputElement;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.usernameInput, "username ref unset");
    this.usernameInput.focus();
  }

  render() {
    return (
      <Modal name="Register" onClose={this.clearModal}>
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
              <div className={css['form-title']}>Email</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  placeholder="Email"
                  value={this.state.email}
                  onChange={this.onChangeEmail}
                  ref={this.emailInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            <div>
              <div className={css['form-title']}>Password</div>
              <div className={css['form-content']}>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={this.state.password}
                    onChange={this.onChangePassword}
                    ref={this.passwordInputRef}
                    disabled={this.props.inputDisabled}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={this.state.confirmPassword}
                    onChange={this.onChangeConfirmPassword}
                    disabled={this.props.inputDisabled}
                  />
                </div>
              </div>
            </div>
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              <span className={css['form-submit']}>
                <input
                  type="submit"
                  value="Register"
                  onClick={this.onSubmit}
                  disabled={this.props.inputDisabled}
                />
              </span>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  usernameInputRef = (usernameInput: ?HTMLInputElement) => {
    this.usernameInput = usernameInput;
  }

  emailInputRef = (emailInput: ?HTMLInputElement) => {
    this.emailInput = emailInput;
  }

  passwordInputRef = (passwordInput: ?HTMLInputElement) => {
    this.passwordInput = passwordInput;
  }

  onChangeUsername = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ username: target.value });
  }

  onChangeEmail = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ email: target.value });
  }

  onChangePassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ password: target.value });
  }

  onChangeConfirmPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmPassword: target.value });
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.password === '') {
      this.setState(
        {
          password: "",
          confirmPassword: "",
          errorMessage: "empty password",
        },
        () => {
          invariant(this.passwordInput, "passwordInput ref unset");
          this.passwordInput.focus();
        },
      );
    } else if (this.state.password !== this.state.confirmPassword) {
      this.setState(
        {
          password: "",
          confirmPassword: "",
          errorMessage: "passwords don't match",
        },
        () => {
          invariant(this.passwordInput, "passwordInput ref unset");
          this.passwordInput.focus();
        },
      );
    } else if (this.state.username.search(validUsernameRegex) === -1) {
      this.setState(
        {
          username: "",
          errorMessage: "alphanumeric usernames only",
        },
        () => {
          invariant(this.usernameInput, "usernameInput ref unset");
          this.usernameInput.focus();
        },
      );
    } else if (this.state.email.search(validEmailRegex) === -1) {
      this.setState(
        {
          email: "",
          errorMessage: "invalid email address",
        },
        () => {
          invariant(this.emailInput, "emailInput ref unset");
          this.emailInput.focus();
        },
      );
    } else {
      const extraInfo = this.props.logInExtraInfo();
      this.props.dispatchActionPromise(
        registerActionTypes,
        this.registerAction(extraInfo),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    }
  }

  async registerAction(extraInfo: LogInExtraInfo) {
    try {
      const result = await this.props.register({
        username: this.state.username,
        email: this.state.email,
        password: this.state.password,
        ...extraInfo,
      });
      this.props.setModal(<VerifyEmailModal onClose={this.clearModal} />);
      return result;
    } catch (e) {
      if (e.message === 'username_taken') {
        this.setState(
          {
            username: "",
            errorMessage: "username already taken",
          },
          () => {
            invariant(this.usernameInput, "usernameInput ref unset");
            this.usernameInput.focus();
          },
        );
      } else if (e.message === 'email_taken') {
        this.setState(
          {
            email: "",
            errorMessage: "email already taken",
          },
          () => {
            invariant(this.emailInput, "emailInput ref unset");
            this.emailInput.focus();
          },
        );
      } else {
        this.setState(
          {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            errorMessage: "unknown error",
          },
          () => {
            invariant(this.usernameInput, "usernameInput ref unset");
            this.usernameInput.focus();
          },
        );
      }
      throw e;
    }
  }

  clearModal = () => {
    this.props.setModal(null);
  }

}

RegisterModal.propTypes = {
  setModal: PropTypes.func.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  logInExtraInfo: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  register: PropTypes.func.isRequired,
};

const loadingStatusSelector = createLoadingStatusSelector(registerActionTypes);

export default connect(
  (state: AppState) => ({
    inputDisabled: loadingStatusSelector(state) === "loading",
    logInExtraInfo: webLogInExtraInfoSelector(state),
  }),
  { register },
)(RegisterModal);
