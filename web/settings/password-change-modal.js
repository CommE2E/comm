// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeKeyserverUserPasswordActionTypes,
  changeKeyserverUserPassword,
  useChangeIdentityUserPassword,
  changeIdentityUserPasswordActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { type PasswordUpdate } from 'lib/types/user-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import css from './password-change-modal.css';
import Button from '../components/button.react.js';
import Input from '../modals/input.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +changeKeyserverUserPassword: (
    passwordUpdate: PasswordUpdate,
  ) => Promise<void>,
  +changeIdentityUserPassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<void>,
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

  render(): React.Node {
    const { inputDisabled } = this.props;

    let errorMsg = <div className={css.errorPlaceholder} />;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css.modalFormError}>{this.state.errorMessage}</div>
      );
    }

    const buttonIsDisabled =
      inputDisabled ||
      this.state.currentPassword.length === 0 ||
      this.state.newPassword.length === 0 ||
      this.state.confirmNewPassword.length === 0;

    const changePasswordButton = (
      <Button
        type="submit"
        variant="filled"
        onClick={this.onSubmit}
        disabled={buttonIsDisabled}
      >
        Change Password
      </Button>
    );

    return (
      <Modal
        name="Change Password"
        onClose={this.props.popModal}
        size="large"
        primaryButton={changePasswordButton}
      >
        <form method="POST">
          <div className={css.formContent}>
            <p className={css.usernameContainer}>
              <span className={css.usernameLabel}>{'Logged in as '}</span>
              <span className={css.username}>{this.props.stringForUser}</span>
            </p>
            <Input
              type="password"
              placeholder="Current password"
              value={this.state.currentPassword}
              onChange={this.onChangeCurrentPassword}
              disabled={inputDisabled}
              ref={this.currentPasswordInputRef}
              label="Current password"
            />
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
          {errorMsg}
        </form>
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

    if (usingCommServicesAccessToken) {
      void this.props.dispatchActionPromise(
        changeIdentityUserPasswordActionTypes,
        this.changeUserSettingsAction(),
      );
    } else {
      void this.props.dispatchActionPromise(
        changeKeyserverUserPasswordActionTypes,
        this.changeUserSettingsAction(),
      );
    }
  };

  async changeUserSettingsAction(): Promise<void> {
    try {
      if (usingCommServicesAccessToken) {
        await this.props.changeIdentityUserPassword(
          this.state.currentPassword,
          this.state.newPassword,
        );
      } else {
        await this.props.changeKeyserverUserPassword({
          updatedFields: {
            password: this.state.newPassword,
          },
          currentPassword: this.state.currentPassword,
        });
      }
      this.props.popModal();
    } catch (e) {
      const messageForException = getMessageForException(e);
      if (
        messageForException === 'invalid_credentials' ||
        messageForException === 'login_failed'
      ) {
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

const changeUserPasswordLoadingStatusSelector = usingCommServicesAccessToken
  ? createLoadingStatusSelector(changeIdentityUserPasswordActionTypes)
  : createLoadingStatusSelector(changeKeyserverUserPasswordActionTypes);
const ConnectedPasswordChangeModal: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedPasswordChangeModal(): React.Node {
    const inputDisabled = useSelector(
      state => changeUserPasswordLoadingStatusSelector(state) === 'loading',
    );
    const callChangeKeyserverUserPassword = useLegacyAshoatKeyserverCall(
      changeKeyserverUserPassword,
    );
    const callChangeIdentityUserPassword = useChangeIdentityUserPassword();
    const dispatchActionPromise = useDispatchActionPromise();

    const modalContext = useModalContext();

    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const stringForUser = useStringForUser(currentUserInfo);

    return (
      <PasswordChangeModal
        inputDisabled={inputDisabled}
        changeKeyserverUserPassword={callChangeKeyserverUserPassword}
        changeIdentityUserPassword={callChangeIdentityUserPassword}
        dispatchActionPromise={dispatchActionPromise}
        popModal={modalContext.popModal}
        stringForUser={stringForUser}
      />
    );
  },
);

export default ConnectedPasswordChangeModal;
