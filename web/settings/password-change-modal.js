// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeUserPasswordActionTypes,
  changeUserPassword,
} from 'lib/actions/user-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import { useStringForUser } from 'lib/hooks/ens-cache';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { type PasswordUpdate } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import Input from '../modals/input.react';
import Modal from '../modals/modal.react';
import { useSelector } from '../redux/redux-utils';
import css from './password-change-modal.css';

type Props = {
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +changeUserPassword: (passwordUpdate: PasswordUpdate) => Promise<void>,
  +popModal: () => void,
  +stringForUser: ?string,
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

  render() {
    let errorMsg;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css['modal-form-error']}>{this.state.errorMessage}</div>
      );
    }

    const { inputDisabled } = this.props;
    return (
      <Modal name="Change Password" onClose={this.props.popModal} size="large">
        <div className={css['modal-body']}>
          <form method="POST">
            <div className={css['form-content']}>
              <p className={css['username-container']}>
                <span className={css['username-label']}>{'Logged in as '}</span>
                <span className={css['username']}>
                  {this.props.stringForUser}
                </span>
              </p>
              <div className={css['form-content']}>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={this.state.currentPassword}
                  onChange={this.onChangeCurrentPassword}
                  disabled={inputDisabled}
                  ref={this.currentPasswordInputRef}
                  label="Current password"
                />
              </div>
              <Input
                type="password"
                placeholder="New password"
                value={this.state.newPassword}
                onChange={this.onChangeNewPassword}
                ref={this.newPasswordInputRef}
                disabled={inputDisabled}
                label="New password"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={this.state.confirmNewPassword}
                onChange={this.onChangeConfirmNewPassword}
                disabled={inputDisabled}
              />
            </div>
            <div className={css['form-footer']}>
              <Button
                type="submit"
                variant="filled"
                onClick={this.onSubmit}
                disabled={
                  inputDisabled ||
                  this.state.currentPassword.length === 0 ||
                  this.state.newPassword.length === 0 ||
                  this.state.confirmNewPassword.length === 0
                }
              >
                Change Password
              </Button>
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
          errorMessage: 'passwords don’t match',
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
      this.props.popModal();
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
    const inputDisabled = useSelector(
      state => changeUserPasswordLoadingStatusSelector(state) === 'loading',
    );
    const callChangeUserPassword = useServerCall(changeUserPassword);
    const dispatchActionPromise = useDispatchActionPromise();

    const modalContext = useModalContext();

    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const stringForUser = useStringForUser(currentUserInfo);

    return (
      <PasswordChangeModal
        inputDisabled={inputDisabled}
        changeUserPassword={callChangeUserPassword}
        dispatchActionPromise={dispatchActionPromise}
        popModal={modalContext.popModal}
        stringForUser={stringForUser}
      />
    );
  },
);

export default ConnectedPasswordChangeModal;
