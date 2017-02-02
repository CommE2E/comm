// @flow

import type { AppState, UpdateStore } from 'lib/model/redux-reducer';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import fetchJSON from 'lib/utils/fetch-json';
import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import { mapStateToUpdateStore } from 'lib/shared/redux-utils';

import css from '../../style.css';
import Modal from '../modal.react';
import VerifyEmailModal from './verify-email-modal.react';

type Props = {
  updateStore: UpdateStore,
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};
type State = {
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
  inputDisabled: bool,
  errorMessage: string,
};

class RegisterModal extends React.Component {

  props: Props;
  state: State;
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
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.usernameInput, "username ref unset");
    this.usernameInput.focus();
  }

  render() {
    return (
      <Modal name="Register" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  placeholder="Username"
                  value={this.state.username}
                  onChange={this.onChangeUsername.bind(this)}
                  ref={(input) => this.usernameInput = input}
                  disabled={this.state.inputDisabled}
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
                  onChange={this.onChangeEmail.bind(this)}
                  ref={(input) => this.emailInput = input}
                  disabled={this.state.inputDisabled}
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
                    onChange={this.onChangePassword.bind(this)}
                    ref={(input) => this.passwordInput = input}
                    disabled={this.state.inputDisabled}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={this.state.confirmPassword}
                    onChange={this.onChangeConfirmPassword.bind(this)}
                    disabled={this.state.inputDisabled}
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
                  onClick={this.onSubmit.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </span>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  onChangeUsername(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ username: target.value });
  }

  onChangeEmail(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ email: target.value });
  }

  onChangePassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ password: target.value });
  }

  onChangeConfirmPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmPassword: target.value });
  }

  async onSubmit(event: SyntheticEvent) {
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
      return;
    }
    if (this.state.password !== this.state.confirmPassword) {
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
      return;
    }
    if (this.state.username.search(validUsernameRegex) === -1) {
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
      return;
    }
    if (this.state.email.search(validEmailRegex) === -1) {
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
      return;
    }

    this.setState({ inputDisabled: true });
    const username = this.state.username;
    const email = this.state.email;
    const response = await fetchJSON('register.php', {
      'username': username,
      'email': email,
      'password': this.state.password,
    });
    if (response.success) {
      this.props.setModal(<VerifyEmailModal onClose={this.props.onClose} />);
      this.props.updateStore((prevState: AppState) => update(prevState, {
        email: { $set: email },
        loggedIn: { $set: true },
        username: { $set: username },
        emailVerified: { $set: false },
      }));
      return;
    }

    if (response.error === 'username_taken') {
      this.setState(
        {
          username: "",
          inputDisabled: false,
          errorMessage: "username already taken",
        },
        () => {
          invariant(this.usernameInput, "usernameInput ref unset");
          this.usernameInput.focus();
        },
      );
    } else if (response.error === 'email_taken') {
      this.setState(
        {
          email: "",
          inputDisabled: false,
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
          inputDisabled: false,
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.usernameInput, "usernameInput ref unset");
          this.usernameInput.focus();
        },
      );
    }
  }

}

RegisterModal.propTypes = {
  updateStore: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default connect(
  undefined,
  mapStateToUpdateStore,
)(RegisterModal);
