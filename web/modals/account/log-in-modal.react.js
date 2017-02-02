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
import ForgotPasswordModal from './forgot-password-modal.react';

type Props = {
  updateStore: UpdateStore,
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};
type State = {
  usernameOrEmail: string,
  password: string,
  inputDisabled: bool,
  errorMessage: string,
};

class LogInModal extends React.Component {

  props: Props;
  state: State;
  usernameOrEmailInput: ?HTMLInputElement;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      usernameOrEmail: "",
      password: "",
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.usernameOrEmailInput, "usernameOrEmail ref unset");
    this.usernameOrEmailInput.focus();
  }

  render() {
    return (
      <Modal name="Log in" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={this.state.usernameOrEmail}
                  onChange={this.onChangeUsernameOrEmail.bind(this)}
                  ref={(input) => this.usernameOrEmailInput = input}
                  disabled={this.state.inputDisabled}
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
                  onChange={this.onChangePassword.bind(this)}
                  ref={(input) => this.passwordInput = input}
                  disabled={this.state.inputDisabled}
                />
                <div className={css['form-subtitle']}>
                  <a href="#" onClick={this.onClickForgotPassword.bind(this)}>
                    Forgot password?
                  </a>
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
                  value="Log in"
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

  onChangeUsernameOrEmail(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ usernameOrEmail: target.value });
  }

  onChangePassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ password: target.value });
  }

  onClickForgotPassword(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <ForgotPasswordModal
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    if (
      this.state.usernameOrEmail.search(validUsernameRegex) === -1 &&
      this.state.usernameOrEmail.search(validEmailRegex) === -1
    ) {
      this.setState(
        {
          usernameOrEmail: "",
          errorMessage: "alphanumeric usernames or emails only",
        },
        () => {
          invariant(
            this.usernameOrEmailInput,
            "usernameOrEmailInput ref unset",
          );
          this.usernameOrEmailInput.focus();
        },
      );
      return;
    }

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('login.php', {
      'username': this.state.usernameOrEmail,
      'password': this.state.password,
    });
    if (response.success) {
      this.props.onClose();
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: { $set: response.calendar_infos },
        email: { $set: response.email },
        loggedIn: { $set: true },
        username: { $set: response.username },
        emailVerified: { $set: response.email_verified },
      }));
      return;
    }

    if (response.error === 'invalid_parameters') {
      this.setState(
        {
          usernameOrEmail: "",
          inputDisabled: false,
          errorMessage: "user doesn't exist",
        },
        () => {
          invariant(
            this.usernameOrEmailInput,
            "usernameOrEmailInput ref unset",
          );
          this.usernameOrEmailInput.focus();
        },
      );
    } else if (response.error === 'invalid_credentials') {
      this.setState(
        {
          password: "",
          inputDisabled: false,
          errorMessage: "wrong password",
        },
        () => {
          invariant(this.passwordInput, "passwordInput ref unset");
          this.passwordInput.focus();
        },
      );
    } else {
      this.setState(
        {
          usernameOrEmail: "",
          password: "",
          inputDisabled: false,
          errorMessage: "unknown error",
        },
        () => {
          invariant(
            this.usernameOrEmailInput,
            "usernameOrEmailInput ref unset",
          );
          this.usernameOrEmailInput.focus();
        },
      );
    }
  }

}

LogInModal.propTypes = {
  updateStore: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default connect(
  undefined,
  mapStateToUpdateStore,
)(LogInModal);
