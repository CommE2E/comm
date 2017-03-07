// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import {
  includeDispatchActionProps,
  createBoundServerCallSelector,
} from 'lib/utils/action-utils';
import {
  forgotPasswordActionType,
  forgotPassword,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import PasswordResetEmailModal from './password-reset-email-modal.react';

type Props = {
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
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

class ForgotPasswordModal extends React.PureComponent {

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
      <Modal name="Reset password" onClose={this.props.onClose}>
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

  onChangeUsernameOrEmail = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ usernameOrEmail: target.value });
  }

  onSubmit = (event: SyntheticEvent) => {
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
      forgotPasswordActionType,
      this.forgotPasswordAction(),
    );
  }

  async forgotPasswordAction() {
    try {
      await this.props.forgotPassword(this.state.usernameOrEmail);
      this.props.setModal(
        <PasswordResetEmailModal onClose={this.props.onClose} />
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

}

ForgotPasswordModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
  inputDisabled: React.PropTypes.bool.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
  forgotPassword: React.PropTypes.func.isRequired, 
};

const forgotPasswordServerCallSelector
  = createBoundServerCallSelector(forgotPassword);
const loadingStatusSelector
  = createLoadingStatusSelector(forgotPasswordActionType);

export default connect(
  (state: AppState) => ({
    inputDisabled: loadingStatusSelector(state) === "loading",
    forgotPassword: forgotPasswordServerCallSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(ForgotPasswordModal);
