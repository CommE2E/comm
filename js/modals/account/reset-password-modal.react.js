// @flow

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import type { AppState } from '../../redux-reducer';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import { thisURL } from '../../nav-utils';

type Props = {
  baseURL: string,
  thisURL: string,
  resetPasswordUsername: string,
  verifyCode: string,
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
      <Modal name="Reset password" onClose={() => {}}>
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
    const response = await fetchJSON(this.props.baseURL, 'reset_password.php', {
      'code': this.props.verifyCode,
      'password': this.state.password,
    });
    if (response.success) {
      window.location.href = this.props.thisURL;
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
  baseURL: React.PropTypes.string.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  resetPasswordUsername: React.PropTypes.string.isRequired,
  verifyCode: React.PropTypes.string.isRequired,
};

export default connect((state: AppState) => ({
  baseURL: state.navInfo.baseURL,
  thisURL: thisURL(state),
  resetPasswordUsername: state.resetPasswordUsername,
  verifyCode: state.verifyCode,
}))(ResetPasswordModal);
