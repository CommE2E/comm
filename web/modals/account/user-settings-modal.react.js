// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  deleteAccountActionTypes,
  deleteAccount,
  changeUserPasswordActionTypes,
  changeUserPassword,
  logOut,
  logOutActionTypes,
} from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogOutResult } from 'lib/types/account-types';
import { type PreRequestUserState } from 'lib/types/session-types';
import {
  type PasswordUpdate,
  type CurrentUserInfo,
} from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import { useSelector } from '../../redux/redux-utils';
import Input from '../input.react';
import Modal from '../modal.react';
import css from './user-settings-modal.css';

type TabType = 'general' | 'delete';
type TabProps = {
  +name: string,
  +tabType: TabType,
  +selected: boolean,
  +onClick: (tabType: TabType) => void,
};
class Tab extends React.PureComponent<TabProps> {
  render() {
    const { selected, name, tabType } = this.props;
    const classNamesForTab = classNames({
      [css['current-tab']]: selected,
      [css['delete-tab']]: selected && tabType === 'delete',
    });
    return (
      <li className={classNamesForTab} onClick={this.onClick}>
        <a>{name}</a>
      </li>
    );
  }

  onClick = () => {
    return this.props.onClick(this.props.tabType);
  };
}

type BaseProps = {
  +setModal: (modal: ?React.Node) => void,
};
type Props = {
  ...BaseProps,
  +currentUserInfo: ?CurrentUserInfo,
  +preRequestUserState: PreRequestUserState,
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +deleteAccount: (
    password: string,
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
  +changeUserPassword: (passwordUpdate: PasswordUpdate) => Promise<void>,
  +logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
};
type State = {
  +newPassword: string,
  +confirmNewPassword: string,
  +currentPassword: string,
  +errorMessage: string,
  +currentTabType: TabType,
};

class UserSettingsModal extends React.PureComponent<Props, State> {
  newPasswordInput: ?HTMLInputElement;
  currentPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      newPassword: '',
      confirmNewPassword: '',
      currentPassword: '',
      errorMessage: '',
      currentTabType: 'general',
    };
  }

  componentDidMount() {
    invariant(this.newPasswordInput, 'newPasswordInput ref unset');
    this.newPasswordInput.focus();
  }

  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
  }

  onLogOut = (event: SyntheticEvent<HTMLButtonElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(logOutActionTypes, this.logOut());
  };

  logOut = async () => {
    await this.props.logOut(this.props.preRequestUserState);
    this.clearModal();
  };

  render() {
    const { inputDisabled } = this.props;
    let mainContent = null;
    if (this.state.currentTabType === 'general') {
      mainContent = (
        <div>
          <div className={css['form-text']}>
            <div className={css['form-title']}>Username</div>
            <div className={css['form-content']}>{this.username}</div>
          </div>
          <div>
            <div className={css['form-title']}>New password</div>
            <div className={css['form-content']}>
              <div>
                <Input
                  type="password"
                  placeholder="New password"
                  value={this.state.newPassword}
                  onChange={this.onChangeNewPassword}
                  ref={this.newPasswordInputRef}
                  disabled={inputDisabled}
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={this.state.confirmNewPassword}
                  onChange={this.onChangeConfirmNewPassword}
                  disabled={inputDisabled}
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
        <Button
          variant="danger"
          type="submit"
          onClick={this.onDelete}
          disabled={inputDisabled}
        >
          Delete account
        </Button>
      );
    } else {
      buttons = (
        <>
          <Button
            type="submit"
            variant="primary"
            onClick={this.onSubmit}
            disabled={inputDisabled}
          >
            Update Account
          </Button>
          <Button
            type="submit"
            variant="secondary"
            onClick={this.onLogOut}
            disabled={inputDisabled}
          >
            Log out
          </Button>
        </>
      );
    }

    let errorMsg;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css['modal-form-error']}>{this.state.errorMessage}</div>
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
                <Input
                  type="password"
                  placeholder="Current password"
                  value={this.state.currentPassword}
                  onChange={this.onChangeCurrentPassword}
                  disabled={inputDisabled}
                  ref={this.currentPasswordInputRef}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              {buttons}
              {errorMsg}
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  newPasswordInputRef = (newPasswordInput: ?HTMLInputElement) => {
    this.newPasswordInput = newPasswordInput;
  };

  currentPasswordInputRef = (currentPasswordInput: ?HTMLInputElement) => {
    this.currentPasswordInput = currentPasswordInput;
  };

  setTab = (tabType: TabType) => {
    this.setState({ currentTabType: tabType });
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

  onSubmit = (event: SyntheticEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (this.state.newPassword === '') {
      this.setState(
        {
          newPassword: '',
          confirmNewPassword: '',
          errorMessage: 'empty password',
          currentTabType: 'general',
        },
        () => {
          invariant(this.newPasswordInput, 'newPasswordInput ref unset');
          this.newPasswordInput.focus();
        },
      );
    } else if (this.state.newPassword !== this.state.confirmNewPassword) {
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

    this.props.dispatchActionPromise(
      changeUserPasswordActionTypes,
      this.changeUserSettingsAction(),
    );
  };

  async changeUserSettingsAction() {
    try {
      await this.props.changeUserPassword({
        updatedFields: {
          password: this.state.newPassword,
        },
        currentPassword: this.state.currentPassword,
      });
      this.clearModal();
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
      } else {
        this.setState(
          {
            newPassword: '',
            confirmNewPassword: '',
            currentPassword: '',
            errorMessage: 'unknown error',
            currentTabType: 'general',
          },
          () => {
            invariant(this.newPasswordInput, 'newPasswordInput ref unset');
            this.newPasswordInput.focus();
          },
        );
      }
      throw e;
    }
  }

  onDelete = (event: SyntheticEvent<HTMLButtonElement>) => {
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
const changeUserPasswordLoadingStatusSelector = createLoadingStatusSelector(
  changeUserPasswordActionTypes,
);

const ConnectedUserSettingsModal: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedUserSettingsModal(props) {
    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const inputDisabled = useSelector(
      state =>
        deleteAccountLoadingStatusSelector(state) === 'loading' ||
        changeUserPasswordLoadingStatusSelector(state) === 'loading',
    );
    const callDeleteAccount = useServerCall(deleteAccount);
    const callChangeUserPassword = useServerCall(changeUserPassword);
    const dispatchActionPromise = useDispatchActionPromise();
    const boundLogOut = useServerCall(logOut);

    return (
      <UserSettingsModal
        {...props}
        currentUserInfo={currentUserInfo}
        preRequestUserState={preRequestUserState}
        inputDisabled={inputDisabled}
        deleteAccount={callDeleteAccount}
        changeUserPassword={callChangeUserPassword}
        dispatchActionPromise={dispatchActionPromise}
        logOut={boundLogOut}
      />
    );
  },
);

export default ConnectedUserSettingsModal;
