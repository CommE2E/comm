// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { ChangeUserSettingsResult } from 'lib/actions/user-actions';
import type { LogOutResult } from 'lib/actions/user-actions';
import type { AccountUpdate } from 'lib/types/user-types';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { validEmailRegex } from 'lib/shared/account-regexes';
import {
  deleteAccountActionTypes,
  deleteAccount,
  changeUserSettingsActionTypes,
  changeUserSettings,
  resendVerificationEmailActionTypes,
  resendVerificationEmail,
} from 'lib/actions/user-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import VerifyEmailModal from './verify-email-modal.react';

type TabType = "general" | "delete";
type TabProps = {
  name: string,
  tabType: TabType,
  selected: bool,
  onClick: (tabType: TabType) => void,
};
class Tab extends React.PureComponent<TabProps> {

  render() {
    const classNamesForTab = classNames({
      [css['current-tab']]: this.props.selected,
      [css['delete-tab']]: this.props.selected &&
        this.props.tabType === "delete",
    });
    return (
      <li className={classNamesForTab} onClick={this.onClick}>
        <a>{this.props.name}</a>
      </li>
    );
  }

  onClick = () => {
    return this.props.onClick(this.props.tabType);
  }

}

type Props = {
  onClose: () => void,
  setModal: (modal: React.Node) => void,
  // Redux state
  username: string,
  email: string,
  emailVerified: bool,
  inputDisabled: bool,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteAccount: (password: string) => Promise<LogOutResult>,
  changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
  resendVerificationEmail: () => Promise<void>,
};
type State = {
  email: string,
  emailVerified: ?bool,
  newPassword: string,
  confirmNewPassword: string,
  currentPassword: string,
  errorMessage: string,
  currentTabType: TabType,
};

class UserSettingsModal extends React.PureComponent<Props, State> {

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
      errorMessage: "",
      currentTabType: "general",
    };
  }

  componentDidMount() {
    invariant(this.emailInput, "email ref unset");
    this.emailInput.focus();
  }

  render() {
    let mainContent = null;
    if (this.state.currentTabType === "general") {
      let verificationStatus = null;
      if (this.state.emailVerified === true) {
        verificationStatus = (
          <div
            className={`${css['form-subtitle']} ${css['verified-status-true']}`}
          >Verified</div>
        );
      } else if (this.state.emailVerified === false) {
        verificationStatus = (
          <div className={css['form-subtitle']}>
            <span className={css['verified-status-false']}>Not verified</span>
            {" - "}
            <a href="#" onClick={this.onClickResendVerificationEmail}>
              resend verification email
            </a>
          </div>
        );
      }
      mainContent = (
        <div>
          <div className={css['form-text']}>
            <div className={css['form-title']}>Username</div>
            <div className={css['form-content']}>{this.props.username}</div>
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
              {verificationStatus}
            </div>
          </div>
          <div>
            <div className={css['form-title']}>New password (optional)</div>
            <div className={css['form-content']}>
              <div>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={this.state.newPassword}
                  onChange={this.onChangeNewPassword}
                  ref={this.newPasswordInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm new password (optional)"
                  value={this.state.confirmNewPassword}
                  onChange={this.onChangeConfirmNewPassword}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === "delete") {
      mainContent = (
        <p className={css['italic']}>
          Your account will be permanently deleted. There is no way to reverse
          this.
        </p>
      );
    }

    let buttons = null;
    if (this.state.currentTabType === "delete") {
      buttons = (
        <span className={css['form-submit']}>
          <input
            type="submit"
            value="Delete account"
            onClick={this.onDelete}
            disabled={this.props.inputDisabled}
          />
        </span>
      );
    } else {
      buttons = (
        <span className={css['form-submit']}>
          <input
            type="submit"
            value="Update account"
            onClick={this.onSubmit}
            disabled={this.props.inputDisabled}
          />
        </span>
      );
    }

    return (
      <Modal name="Edit account" onClose={this.props.onClose} size="large">
        <ul className={css['tab-panel']}>
          <Tab
            name="General"
            tabType="general"
            onClick={this.setTab}
            selected={this.state.currentTabType === "general"}
            key="general"
          />
          <Tab
            name="Delete"
            tabType="delete"
            onClick={this.setTab}
            selected={this.state.currentTabType === "delete"}
            key="delete"
          />
        </ul>
        <div className={css['modal-body']}>
          <form method="POST">
            {mainContent}
            <div className={css['user-settings-current-password']}>
              <p className={css['confirm-account-password']}>
                Please enter your current password to confirm your identity
              </p>
              <div className={css['form-title']}>Current password</div>
              <div className={css['form-content']}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={this.state.currentPassword}
                  onChange={this.onChangeCurrentPassword}
                  disabled={this.props.inputDisabled}
                  ref={this.currentPasswordInputRef}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              {buttons}
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  emailInputRef = (emailInput: ?HTMLInputElement) => {
    this.emailInput = emailInput;
  }

  newPasswordInputRef = (newPasswordInput: ?HTMLInputElement) => {
    this.newPasswordInput = newPasswordInput;
  }

  currentPasswordInputRef = (currentPasswordInput: ?HTMLInputElement) => {
    this.currentPasswordInput = currentPasswordInput;
  }

  setTab = (tabType: TabType) => {
    this.setState({ currentTabType: tabType });
  };

  onChangeEmail = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      email: target.value,
      emailVerified: target.value === this.props.email
        ? this.props.emailVerified
        : null,
    });
  }

  onChangeNewPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ newPassword: target.value });
  }

  onChangeConfirmNewPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmNewPassword: target.value });
  }

  onChangeCurrentPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ currentPassword: target.value });
  }

  onClickResendVerificationEmail = (
    event: SyntheticEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      resendVerificationEmailActionTypes,
      this.resendVerificationEmailAction(),
    );
  }

  async resendVerificationEmailAction() {
    await this.props.resendVerificationEmail();
    this.props.setModal(<VerifyEmailModal onClose={this.props.onClose} />);
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.newPassword !== this.state.confirmNewPassword) {
      this.setState(
        {
          newPassword: "",
          confirmNewPassword: "",
          errorMessage: "passwords don't match",
          currentTabType: "general",
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
          currentTabType: "general",
        },
        () => {
          invariant(this.emailInput, "emailInput ref unset");
          this.emailInput.focus();
        },
      );
      return;
    }

    this.props.dispatchActionPromise(
      changeUserSettingsActionTypes,
      this.changeUserSettingsAction(),
    );
  }

  async changeUserSettingsAction() {
    const email = this.state.email;
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          email,
          password: this.state.newPassword,
        },
        currentPassword: this.state.currentPassword,
      });
      if (email !== this.props.email) {
        this.props.setModal(<VerifyEmailModal onClose={this.props.onClose} />);
      } else {
        this.props.onClose();
      }
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        this.setState(
          {
            currentPassword: "",
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
      } else if (e.message === 'email_taken') {
        this.setState(
          {
            email: this.props.email,
            emailVerified: this.props.emailVerified,
            errorMessage: "email already taken",
            currentTabType: "general",
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
            errorMessage: "unknown error",
            currentTabType: "general",
          },
          () => {
            invariant(this.emailInput, "emailInput ref unset");
            this.emailInput.focus();
          },
        );
      }
      throw e;
    }
  }

  onDelete = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      deleteAccountActionTypes,
      this.deleteAction(),
    );
  }

  async deleteAction() {
    try {
      const response = await this.props.deleteAccount(
        this.state.currentPassword,
      );
      this.props.onClose();
      return response;
    } catch(e) {
      const errorMessage = e.message === "invalid_credentials"
        ? "wrong password"
        : "unknown error";
      this.setState(
        {
          currentPassword: "",
          errorMessage: errorMessage,
        },
        () => {
          invariant(
            this.currentPasswordInput,
            "currentPasswordInput ref unset",
          );
          this.currentPasswordInput.focus();
        },
      );
      throw e;
    }
  }

}

UserSettingsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  setModal: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  emailVerified: PropTypes.bool.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  deleteAccount: PropTypes.func.isRequired,
  changeUserSettings: PropTypes.func.isRequired,
  resendVerificationEmail: PropTypes.func.isRequired,
};

const deleteAccountLoadingStatusSelector
  = createLoadingStatusSelector(deleteAccountActionTypes);
const changeUserSettingsLoadingStatusSelector
  = createLoadingStatusSelector(changeUserSettingsActionTypes);
const resendVerificationEmailLoadingStatusSelector
  = createLoadingStatusSelector(resendVerificationEmailActionTypes);

export default connect(
  (state: AppState) => ({
    username: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.username
      : undefined,
    email: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.email
      : undefined,
    emailVerified: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.emailVerified
      : undefined,
    inputDisabled: deleteAccountLoadingStatusSelector(state) === "loading" ||
      changeUserSettingsLoadingStatusSelector(state) === "loading" ||
      resendVerificationEmailLoadingStatusSelector(state) === "loading",
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({
    deleteAccount,
    changeUserSettings,
    resendVerificationEmail,
  }),
)(UserSettingsModal);
