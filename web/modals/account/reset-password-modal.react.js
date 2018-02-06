// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LogInResult } from 'lib/actions/user-actions';

import * as React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  resetPasswordActionTypes,
  resetPassword,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {
  onClose: () => void,
  onSuccess: () => void,
  // Redux state
  resetPasswordUsername: string,
  verifyCode: string,
  inputDisabled: bool,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  resetPassword: (code: string, password: string) => Promise<LogInResult>,
};
type State = {
  password: string,
  confirmPassword: string,
  errorMessage: string,
};

class ResetPasswordModal extends React.PureComponent<Props, State> {

  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: "",
      confirmPassword: "",
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
        <div className={css['modal-body']}>
          <form method="POST">
            <div className={css['form-text']}>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                {this.props.resetPasswordUsername}
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
                  value="Update"
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

  passwordInputRef = (passwordInput: ?HTMLInputElement) => {
    this.passwordInput = passwordInput;
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

    this.props.dispatchActionPromise(
      resetPasswordActionTypes,
      this.resetPasswordAction(),
    );
  }

  async resetPasswordAction() {
    try {
      const response = await this.props.resetPassword(
        this.props.verifyCode,
        this.state.password,
      );
      this.props.onSuccess();
      return response;
    } catch (e) {
      this.setState(
        {
          password: "",
          confirmPassword: "",
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.passwordInput, "passwordInput ref unset");
          this.passwordInput.focus();
        },
      );
      throw e;
    }
  }

}

ResetPasswordModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  resetPasswordUsername: PropTypes.string.isRequired,
  verifyCode: PropTypes.string.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  resetPassword: PropTypes.func.isRequired,
};

const loadingStatusSelector
  = createLoadingStatusSelector(resetPasswordActionTypes);

export default connect(
  (state: AppState) => ({
    resetPasswordUsername: state.resetPasswordUsername,
    verifyCode: state.navInfo.verify,
    inputDisabled: loadingStatusSelector(state) === "loading",
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ resetPassword }),
)(ResetPasswordModal);
