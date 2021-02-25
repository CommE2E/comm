// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import * as React from 'react';

import {
  deleteAccountActionTypes,
  deleteAccount,
  changeUserSettingsActionTypes,
  changeUserSettings,
  resendVerificationEmailActionTypes,
  resendVerificationEmail,
} from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { validEmailRegex } from 'lib/shared/account-utils';
import type {
  LogOutResult,
  ChangeUserSettingsResult,
} from 'lib/types/account-types';
import {
  type PreRequestUserState,
  preRequestUserStatePropType,
} from 'lib/types/session-types';
import {
  type AccountUpdate,
  type CurrentUserInfo,
  currentUserPropType,
} from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { useSelector } from '../../redux/redux-utils';
import css from '../../style.css';
import Modal from '../modal.react';
import VerifyEmailModal from './verify-email-modal.react';

type TabType = 'general' | 'delete';
type TabProps = {
  name: string,
  tabType: TabType,
  selected: boolean,
  onClick: (tabType: TabType) => void,
};
class Tab extends React.PureComponent<TabProps> {
  render() {
    const classNamesForTab = classNames({
      [css['current-tab']]: this.props.selected,
      [css['delete-tab']]:
        this.props.selected && this.props.tabType === 'delete',
    });
    return (
      <li className={classNamesForTab} onClick={this.onClick}>
        <a>{this.props.name}</a>
      </li>
    );
  }

  onClick = () => {
    return this.props.onClick(this.props.tabType);
  };
}

type BaseProps = {|
  +setModal: (modal: ?React.Node) => void,
|};
type Props = {|
  ...BaseProps,
  +currentUserInfo: ?CurrentUserInfo,
  +preRequestUserState: PreRequestUserState,
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +deleteAccount: (
    password: string,
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
  +changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
  +resendVerificationEmail: () => Promise<void>,
|};
type State = {
  email: ?string,
  emailVerified: ?boolean,
  newPassword: string,
  confirmNewPassword: string,
  currentPassword: string,
  errorMessage: string,
  currentTabType: TabType,
};

class UserSettingsModal extends React.PureComponent<Props, State> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
    currentUserInfo: currentUserPropType,
    preRequestUserState: preRequestUserStatePropType.isRequired,
    inputDisabled: PropTypes.bool.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteAccount: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
    resendVerificationEmail: PropTypes.func.isRequired,
  };
  emailInput: ?HTMLInputElement;
  newPasswordInput: ?HTMLInputElement;
  currentPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      email: this.email,
      emailVerified: this.emailVerified,
      newPassword: '',
      confirmNewPassword: '',
      currentPassword: '',
      errorMessage: '',
      currentTabType: 'general',
    };
  }

  componentDidMount() {
    invariant(this.emailInput, 'email ref unset');
    this.emailInput.focus();
  }

  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
  }

  get email() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.email
      : undefined;
  }

  get emailVerified() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.emailVerified
      : undefined;
  }

  render() {
    let mainContent = null;
    if (this.state.currentTabType === 'general') {
      let verificationStatus = null;
      if (this.state.emailVerified === true) {
        verificationStatus = (
          <div
            className={`${css['form-subtitle']} ${css['verified-status-true']}`}
          >
            Verified
          </div>
        );
      } else if (this.state.emailVerified === false) {
        verificationStatus = (
          <div className={css['form-subtitle']}>
            <span className={css['verified-status-false']}>Not verified</span>
            {' - '}
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
            <div className={css['form-content']}>{this.username}</div>
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
    } else if (this.state.currentTabType === 'delete') {
      mainContent = (
        <p className={css['italic']}>
          Your account will be permanently deleted. There is no way to reverse
          this.
        </p>
      );
    }

    let buttons = null;
    if (this.state.currentTabType === 'delete') {
      buttons = (
        <input
          type="submit"
          value="Delete account"
          onClick={this.onDelete}
          disabled={this.props.inputDisabled}
        />
      );
    } else {
      buttons = (
        <input
          type="submit"
          value="Update account"
          onClick={this.onSubmit}
          disabled={this.props.inputDisabled}
        />
      );
    }

    return (
      <Modal name="Edit account" onClose={this.clearModal} size="large">
        <ul className={css['tab-panel']}>
          <Tab
            name="General"
            tabType="general"
            onClick={this.setTab}
            selected={this.state.currentTabType === 'general'}
            key="general"
          />
          <Tab
            name="Delete"
            tabType="delete"
            onClick={this.setTab}
            selected={this.state.currentTabType === 'delete'}
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
              {buttons}
              <div className={css['modal-form-error']}>
                {this.state.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  emailInputRef = (emailInput: ?HTMLInputElement) => {
    this.emailInput = emailInput;
  };

  newPasswordInputRef = (newPasswordInput: ?HTMLInputElement) => {
    this.newPasswordInput = newPasswordInput;
  };

  currentPasswordInputRef = (currentPasswordInput: ?HTMLInputElement) => {
    this.currentPasswordInput = currentPasswordInput;
  };

  setTab = (tabType: TabType) => {
    this.setState({ currentTabType: tabType });
  };

  onChangeEmail = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({
      email: target.value,
      emailVerified: target.value === this.email ? this.emailVerified : null,
    });
  };

  onChangeNewPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ newPassword: target.value });
  };

  onChangeConfirmNewPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ confirmNewPassword: target.value });
  };

  onChangeCurrentPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ currentPassword: target.value });
  };

  onClickResendVerificationEmail = (
    event: SyntheticEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      resendVerificationEmailActionTypes,
      this.resendVerificationEmailAction(),
    );
  };

  async resendVerificationEmailAction() {
    await this.props.resendVerificationEmail();
    this.props.setModal(<VerifyEmailModal onClose={this.clearModal} />);
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.newPassword !== this.state.confirmNewPassword) {
      this.setState(
        {
          newPassword: '',
          confirmNewPassword: '',
          errorMessage: "passwords don't match",
          currentTabType: 'general',
        },
        () => {
          invariant(this.newPasswordInput, 'newPasswordInput ref unset');
          this.newPasswordInput.focus();
        },
      );
      return;
    }

    const { email } = this.state;
    if (!email || email.search(validEmailRegex) === -1) {
      this.setState(
        {
          email: '',
          errorMessage: 'invalid email address',
          currentTabType: 'general',
        },
        () => {
          invariant(this.emailInput, 'emailInput ref unset');
          this.emailInput.focus();
        },
      );
      return;
    }

    this.props.dispatchActionPromise(
      changeUserSettingsActionTypes,
      this.changeUserSettingsAction(email),
    );
  };

  async changeUserSettingsAction(email: string) {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          email,
          password: this.state.newPassword,
        },
        currentPassword: this.state.currentPassword,
      });
      if (email !== this.email) {
        this.props.setModal(<VerifyEmailModal onClose={this.clearModal} />);
      } else {
        this.clearModal();
      }
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        this.setState(
          {
            currentPassword: '',
            errorMessage: 'wrong current password',
          },
          () => {
            invariant(
              this.currentPasswordInput,
              'currentPasswordInput ref unset',
            );
            this.currentPasswordInput.focus();
          },
        );
      } else if (e.message === 'email_taken') {
        this.setState(
          {
            email: this.email,
            emailVerified: this.emailVerified,
            errorMessage: 'email already taken',
            currentTabType: 'general',
          },
          () => {
            invariant(this.emailInput, 'emailInput ref unset');
            this.emailInput.focus();
          },
        );
      } else {
        this.setState(
          {
            email: this.email,
            emailVerified: this.emailVerified,
            newPassword: '',
            confirmNewPassword: '',
            currentPassword: '',
            errorMessage: 'unknown error',
            currentTabType: 'general',
          },
          () => {
            invariant(this.emailInput, 'emailInput ref unset');
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
  };

  async deleteAction() {
    try {
      const response = await this.props.deleteAccount(
        this.state.currentPassword,
        this.props.preRequestUserState,
      );
      this.clearModal();
      return response;
    } catch (e) {
      const errorMessage =
        e.message === 'invalid_credentials'
          ? 'wrong password'
          : 'unknown error';
      this.setState(
        {
          currentPassword: '',
          errorMessage: errorMessage,
        },
        () => {
          invariant(
            this.currentPasswordInput,
            'currentPasswordInput ref unset',
          );
          this.currentPasswordInput.focus();
        },
      );
      throw e;
    }
  }

  clearModal = () => {
    this.props.setModal(null);
  };
}

const deleteAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);
const changeUserSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeUserSettingsActionTypes,
);
const resendVerificationEmailLoadingStatusSelector = createLoadingStatusSelector(
  resendVerificationEmailActionTypes,
);

export default React.memo<BaseProps>(function ConnectedUserSettingsModal(
  props: BaseProps,
) {
  const currentUserInfo = useSelector((state) => state.currentUserInfo);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const inputDisabled = useSelector(
    (state) =>
      deleteAccountLoadingStatusSelector(state) === 'loading' ||
      changeUserSettingsLoadingStatusSelector(state) === 'loading' ||
      resendVerificationEmailLoadingStatusSelector(state) === 'loading',
  );
  const callDeleteAccount = useServerCall(deleteAccount);
  const callChangeUserSettings = useServerCall(changeUserSettings);
  const callResendVerificationEmail = useServerCall(resendVerificationEmail);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <UserSettingsModal
      {...props}
      currentUserInfo={currentUserInfo}
      preRequestUserState={preRequestUserState}
      inputDisabled={inputDisabled}
      deleteAccount={callDeleteAccount}
      changeUserSettings={callChangeUserSettings}
      resendVerificationEmail={callResendVerificationEmail}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
