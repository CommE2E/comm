// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeUserPasswordActionTypes,
  changeUserPassword,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  type PasswordUpdate,
  type CurrentUserInfo,
} from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import Input from '../modals/input.react';
import { useModalContext } from '../modals/modal-provider.react';
import Modal from '../modals/modal.react';
import { useSelector } from '../redux/redux-utils';
import css from './password-change-modal.css';

type Props = {
  +currentUserInfo: ?CurrentUserInfo,
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +changeUserPassword: (passwordUpdate: PasswordUpdate) => Promise<void>,
  +clearModal: () => void,
};
type State = {
  +newPassword: string,
  +confirmNewPassword: string,
  +currentPassword: string,
  +errorMessage: string,
};

class PasswordChangeModal extends React.PureComponent<Props, State> {
  newPasswordInput: ?HTMLInputElement;
  currentPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      newPassword: '',
      confirmNewPassword: '',
      currentPassword: '',
      errorMessage: '',
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
    const { inputDisabled } = this.props;
    const mainContent = (
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

    const buttons = (
      <Button
        type="submit"
        variant="primary"
        onClick={this.onSubmit}
        disabled={inputDisabled}
      >
        Update Account
      </Button>
    );

    let errorMsg;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css['modal-form-error']}>{this.state.errorMessage}</div>
      );
    }

    return (
      <Modal name="Edit account" onClose={this.props.clearModal} size="large">
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
      this.props.clearModal();
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
}

const changeUserPasswordLoadingStatusSelector = createLoadingStatusSelector(
  changeUserPasswordActionTypes,
);
const ConnectedPasswordChangeModal: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedPasswordChangeModal(): React.Node {
    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const inputDisabled = useSelector(
      state => changeUserPasswordLoadingStatusSelector(state) === 'loading',
    );
    const callChangeUserPassword = useServerCall(changeUserPassword);
    const dispatchActionPromise = useDispatchActionPromise();

    const modalContext = useModalContext();

    return (
      <PasswordChangeModal
        currentUserInfo={currentUserInfo}
        inputDisabled={inputDisabled}
        changeUserPassword={callChangeUserPassword}
        dispatchActionPromise={dispatchActionPromise}
        clearModal={modalContext.clearModal}
      />
    );
  },
);

export default ConnectedPasswordChangeModal;
