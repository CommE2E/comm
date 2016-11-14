// @flow

import type { AppState } from '../../redux-reducer';

import React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import { connect } from 'react-redux';

import Modal from '../modal.react';
import fetchJSON from '../../fetch-json';
import { validEmailRegex } from './account-regexes';
import VerifyEmailModal from './verify-email-modal.react';
import { thisURL, monthURL } from '../../nav-utils';

type Tab = "general" | "delete";
type Props = {
  thisURL: string,
  monthURL: string,
  username: string,
  email: string,
  emailVerified: bool,
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};
type State = {
  email: string,
  emailVerified: ?bool,
  newPassword: string,
  confirmNewPassword: string,
  currentPassword: string,
  inputDisabled: bool,
  errorMessage: string,
  currentTab: Tab,
};

class UserSettingsModal extends React.Component {

  props: Props;
  state: State;
  emailInput: ?HTMLInputElement;
  newPasswordInput: ?HTMLInputElement;
  currentPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      email: props.email,
      emailVerified: props.emailVerified,
      newPassword: "",
      confirmNewPassword: "",
      currentPassword: "",
      inputDisabled: false,
      errorMessage: "",
      currentTab: "general",
    };
  }

  componentDidMount() {
    invariant(this.emailInput, "email ref unset");
    this.emailInput.focus();
  }

  render() {
    let mainContent = null;
    if (this.state.currentTab === "general") {
      let verificationStatus = null;
      if (this.state.emailVerified === true) {
        verificationStatus = (
          <div className="form-subtitle verified-status-true">Verified</div>
        );
      } else if (this.state.emailVerified === false) {
        verificationStatus = (
          <div className="form-subtitle">
            <span className="verified-status-false">Not verified</span>
            {" - "}
            <a href="#" onClick={this.onClickResendVerificationEmail.bind(this)}>
              resend verification email
            </a>
          </div>
        );
      }
      mainContent = (
        <div>
          <div className="form-text">
            <div className="form-title">Username</div>
            <div className="form-content">{this.props.username}</div>
          </div>
          <div>
            <div className="form-title">Email</div>
            <div className="form-content">
              <input
                type="text"
                placeholder="Email"
                value={this.state.email}
                onChange={this.onChangeEmail.bind(this)}
                ref={(input) => this.emailInput = input}
                disabled={this.state.inputDisabled}
              />
              {verificationStatus}
            </div>
          </div>
          <div>
            <div className="form-title">New password (optional)</div>
            <div className="form-content">
              <div>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={this.state.newPassword}
                  onChange={this.onChangeNewPassword.bind(this)}
                  ref={(input) => this.newPasswordInput = input}
                  disabled={this.state.inputDisabled}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm new password (optional)"
                  value={this.state.confirmNewPassword}
                  onChange={this.onChangeConfirmNewPassword.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "delete") {
      mainContent = (
        <p className="italic">
          Your account will be permanently deleted. There is no way to reverse
          this.
        </p>
      );
    }

    let buttons = null;
    if (this.state.currentTab === "delete") {
      buttons = (
        <span className="form-submit">
          <input
            type="submit"
            value="Delete account"
            onClick={this.onDelete.bind(this)}
            disabled={this.state.inputDisabled}
          />
        </span>
      );
    } else {
      buttons = (
        <span className="form-submit">
          <input
            type="submit"
            value="Update account"
            onClick={this.onSubmit.bind(this)}
            disabled={this.state.inputDisabled}
          />
        </span>
      );
    }

    return (
      <Modal name="Edit account" onClose={this.props.onClose} size="large">
        <ul className="tab-panel">
          {this.buildTab("general", "General")}
          {this.buildTab("delete", "Delete")}
        </ul>
        <div className="modal-body">
          <form method="POST">
            {mainContent}
            <div className="user-settings-current-password">
              <p className="confirm-account-password">
                Please enter your current password to confirm your identity
              </p>
              <div className="form-title">Current password</div>
              <div className="form-content">
                <input
                  type="password"
                  placeholder="Current password"
                  value={this.state.currentPassword}
                  onChange={this.onChangeCurrentPassword.bind(this)}
                  disabled={this.state.inputDisabled}
                  ref={(input) => this.currentPasswordInput = input}
                />
              </div>
            </div>
            <div className="form-footer">
              <span className="modal-form-error">
                {this.state.errorMessage}
              </span>
              {buttons}
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  buildTab(tab: Tab, name: string) {
    const currentTab = this.state.currentTab;
    const classNamesForTab = classNames({
      'current-tab': currentTab === tab,
      'delete-tab': currentTab === tab && tab === "delete",
    });
    return (
      <li
        className={classNamesForTab}
        onClick={(e) => this.setState({ "currentTab": tab })}
      >
        <a>{name}</a>
      </li>
    );
  }

  onChangeEmail(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      email: target.value,
      emailVerified: target.value === this.props.email
        ? this.props.emailVerified
        : null,
    });
  }

  onChangeNewPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ newPassword: target.value });
  }

  onChangeConfirmNewPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmNewPassword: target.value });
  }

  onChangeCurrentPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ currentPassword: target.value });
  }

  async onClickResendVerificationEmail(event: SyntheticEvent) {
    event.preventDefault();
    await fetchJSON('resend_verification.php', {});
    this.props.setModal(<VerifyEmailModal onClose={this.props.onClose} />);
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    if (this.state.newPassword !== this.state.confirmNewPassword) {
      this.setState(
        {
          newPassword: "",
          confirmNewPassword: "",
          errorMessage: "passwords don't match",
        },
        () => {
          invariant(this.newPasswordInput, "newPasswordInput ref unset");
          this.newPasswordInput.focus();
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
    const response = await fetchJSON('edit_account.php', {
      'email': this.state.email,
      'new_password': this.state.newPassword,
      'old_password': this.state.currentPassword,
    });
    if (response.success) {
      if (this.state.email !== this.props.email) {
        window.location.href = this.props.thisURL + "&show=verify_email";
      } else {
        window.location.href = this.props.thisURL;
      }
      return;
    }

    if (response.error === 'invalid_credentials') {
      this.setState(
        {
          currentPassword: "",
          inputDisabled: false,
          errorMessage: "wrong current password",
        },
        () => {
          invariant(
            this.currentPasswordInput,
            "currentPasswordInput ref unset",
          );
          this.currentPasswordInput.focus();
        },
      );
    } else if (response.error === 'email_taken') {
      this.setState(
        {
          email: this.props.email,
          emailVerified: this.props.emailVerified,
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
          email: this.props.email,
          emailVerified: this.props.emailVerified,
          newPassword: "",
          confirmNewPassword: "",
          currentPassword: "",
          inputDisabled: false,
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.emailInput, "emailInput ref unset");
          this.emailInput.focus();
        },
      );
    }
  }

  async onDelete(event: SyntheticEvent) {
    event.preventDefault();

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('delete_account.php', {
      'password': this.state.currentPassword,
    });
    if (response.success) {
      window.location.href = this.props.monthURL;
      return;
    }

    const errorMessage = response.error === "invalid_credentials"
      ? "wrong password"
      : "unknown error";
    this.setState(
      {
        currentPassword: "",
        errorMessage: errorMessage,
        inputDisabled: false,
      },
      () => {
        invariant(this.currentPasswordInput, "currentPasswordInput ref unset");
        this.currentPasswordInput.focus();
      },
    );
  }

}

UserSettingsModal.propTypes = {
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  username: React.PropTypes.string.isRequired,
  email: React.PropTypes.string.isRequired,
  emailVerified: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  thisURL: thisURL(state),
  monthURL: monthURL(state),
  username: state.username,
  email: state.email,
  emailVerified: state.emailVerified,
}))(UserSettingsModal);
