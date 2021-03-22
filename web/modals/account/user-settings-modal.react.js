// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  deleteAccountActionTypes,
  deleteAccount,
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogOutResult } from 'lib/types/account-types';
import { type PreRequestUserState } from 'lib/types/session-types';
import { type AccountUpdate, type CurrentUserInfo } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { useSelector } from '../../redux/redux-utils';
import css from '../../style.css';
import Modal from '../modal.react';

type TabType = 'general' | 'delete';
type TabProps = {
  +name: string,
  +tabType: TabType,
  +selected: boolean,
  +onClick: (tabType: TabType) => void,
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
  +changeUserSettings: (accountUpdate: AccountUpdate) => Promise<void>,
|};
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

  render() {
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
                <input
                  type="password"
                  placeholder="New password"
                  value={this.state.newPassword}
                  onChange={this.onChangeNewPassword}
                  ref={this.newPasswordInputRef}
                  disabled={this.props.inputDisabled}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm new password"
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

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
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
      changeUserSettingsActionTypes,
      this.changeUserSettingsAction(),
    );
  };

  async changeUserSettingsAction() {
    try {
      await this.props.changeUserSettings({
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

export default React.memo<BaseProps>(function ConnectedUserSettingsModal(
  props: BaseProps,
) {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const inputDisabled = useSelector(
    state =>
      deleteAccountLoadingStatusSelector(state) === 'loading' ||
      changeUserSettingsLoadingStatusSelector(state) === 'loading',
  );
  const callDeleteAccount = useServerCall(deleteAccount);
  const callChangeUserSettings = useServerCall(changeUserSettings);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <UserSettingsModal
      {...props}
      currentUserInfo={currentUserInfo}
      preRequestUserState={preRequestUserState}
      inputDisabled={inputDisabled}
      deleteAccount={callDeleteAccount}
      changeUserSettings={callChangeUserSettings}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
