// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  forgotPasswordActionTypes,
  forgotPassword,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import PasswordResetEmailModal from './password-reset-email-modal.react';

type Props = {
  setModal: (modal: ?React.Node) => void,
  // Redux state
  inputDisabled: bool,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  forgotPassword: (usernameOrEmail: string) => Promise<void>,
};
type State = {
  usernameOrEmail: string,
  errorMessage: string,
};

class ForgotPasswordModal extends React.PureComponent<Props, State> {

  props: Props;
  state: State;
  usernameOrEmailInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      usernameOrEmail: "",
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.usernameOrEmailInput, "usernameOrEmail ref unset");
    this.usernameOrEmailInput.focus();
  }

  render() {
    return (
      <Modal name="Reset password" onClose={this.clearModal}>
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={this.state.usernameOrEmail}
                  onChange={this.onChangeUsernameOrEmail}
                  ref={this.usernameOrEmailInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              <span className={css['form-submit']}>
                <input
                  type="submit"
                  value="Reset"
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

  usernameOrEmailInputRef = (usernameOrEmailInput: ?HTMLInputElement) => {
    this.usernameOrEmailInput = usernameOrEmailInput;
  }

  onChangeUsernameOrEmail = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ usernameOrEmail: target.value });
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
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

    this.props.dispatchActionPromise(
      forgotPasswordActionTypes,
      this.forgotPasswordAction(),
    );
  }

  async forgotPasswordAction() {
    try {
      await this.props.forgotPassword(this.state.usernameOrEmail);
      this.props.setModal(
        <PasswordResetEmailModal onClose={this.clearModal} />
      );
    } catch (e) {
      this.setState(
        {
          usernameOrEmail: "",
          errorMessage: e.message === 'invalid_user'
            ? "user doesn't exist"
            : "unknown error",
        },
        () => {
          invariant(
            this.usernameOrEmailInput,
            "usernameOrEmailInput ref unset",
          );
          this.usernameOrEmailInput.focus();
        },
      );
      throw e;
    }
  }

  clearModal = () => {
    this.props.setModal(null);
  }

}

ForgotPasswordModal.propTypes = {
  setModal: PropTypes.func.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  forgotPassword: PropTypes.func.isRequired,
};

const loadingStatusSelector
  = createLoadingStatusSelector(forgotPasswordActionTypes);

export default connect(
  (state: AppState) => ({
    inputDisabled: loadingStatusSelector(state) === "loading",
  }),
  { forgotPassword },
)(ForgotPasswordModal);
