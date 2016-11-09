// @flow

import React from 'react';
import invariant from 'invariant';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import { validUsernameRegex, validEmailRegex } from './account-regexes';
import PasswordResetEmailModal from './password-reset-email-modal.react';

type Props = {
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};
type State = {
  usernameOrEmail: string,
  inputDisabled: bool,
  errorMessage: string,
};

class ForgotPasswordModal extends React.Component {

  props: Props;
  state: State;
  usernameOrEmailInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      usernameOrEmail: "",
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
      <Modal name="Reset password" onClose={this.props.onClose}>
        <div className="modal-body">
          <form method="POST">
            <div>
              <div className="form-title">Username</div>
              <div className="form-content">
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
            <div className="form-footer">
              <span className="modal-form-error">
                {this.state.errorMessage}
              </span>
              <span className="form-submit">
                <input
                  type="submit"
                  value="Reset"
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
    const response = await fetchJSON('forgot_password.php', {
      'username': this.state.usernameOrEmail,
    });
    if (response.success) {
      this.props.setModal(
        <PasswordResetEmailModal onClose={this.props.onClose} />
      );
      return;
    }

    this.setState(
      {
        usernameOrEmail: "",
        inputDisabled: false,
        errorMessage: response.error === 'invalid_user'
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
  }

}

ForgotPasswordModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default ForgotPasswordModal;
