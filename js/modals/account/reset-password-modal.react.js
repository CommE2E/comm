// @flow

import type { AppState, UpdateStore } from '../../redux-reducer';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import { thisURL } from '../../nav-utils';
import { mapStateToUpdateStore } from '../../redux-utils';

type Props = {
  onClose: () => void,
  onSuccess: () => void,
  thisURL: string,
  resetPasswordUsername: string,
  verifyCode: string,
  updateStore: UpdateStore,
};
type State = {
  password: string,
  confirmPassword: string,
  inputDisabled: bool,
  errorMessage: string,
};

class ResetPasswordModal extends React.Component {

  props: Props;
  state: State;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: "",
      confirmPassword: "",
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.passwordInput, "usernameOrEmail ref unset");
    this.passwordInput.focus();
  }

  render() {
    return (
      <Modal name="Reset password" onClose={this.props.onClose}>
        <div className="modal-body">
          <form method="POST">
            <div className="form-text">
              <div className="form-title">Username</div>
              <div className="form-content">
                {this.props.resetPasswordUsername}
              </div>
            </div>
            <div>
              <div className="form-title">Password</div>
              <div className="form-content">
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
            <div className="form-footer">
              <span className="modal-form-error">
                {this.state.errorMessage}
              </span>
              <span className="form-submit">
                <input
                  type="submit"
                  value="Update"
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

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('reset_password.php', {
      'code': this.props.verifyCode,
      'password': this.state.password,
    });
    if (response.success) {
      this.props.onSuccess();
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: { $set: response.calendar_infos },
        email: { $set: response.email },
        loggedIn: { $set: true },
        username: { $set: response.username },
        emailVerified: { $set: response.email_verified },
      }));
      return;
    }

    this.setState(
      {
        password: "",
        confirmPassword: "",
        inputDisabled: false,
        errorMessage: "unknown error",
      },
      () => {
        invariant(this.passwordInput, "passwordInput ref unset");
        this.passwordInput.focus();
      },
    );
  }

}

ResetPasswordModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  onSuccess: React.PropTypes.func.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  resetPasswordUsername: React.PropTypes.string.isRequired,
  verifyCode: React.PropTypes.string.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    thisURL: thisURL(state),
    resetPasswordUsername: state.resetPasswordUsername,
    verifyCode: state.verifyCode,
  }),
  mapStateToUpdateStore,
)(ResetPasswordModal);
