// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  deleteAccount,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogOutResult } from 'lib/types/account-types';
import type { PreRequestUserState } from 'lib/types/session-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import Input from '../modals/input.react';
import { useModalContext } from '../modals/modal-provider.react';
import Modal from '../modals/modal.react';
import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react.js';
import css from './account-delete-modal.css';

type Props = {
  +preRequestUserState: PreRequestUserState,
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +deleteAccount: (
    password: string,
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
  +popModal: () => void,
};
type State = {
  +currentPassword: string,
  +errorMessage: string,
};

class AccountDeleteModal extends React.PureComponent<Props, State> {
  currentPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPassword: '',
      errorMessage: '',
    };
  }

  componentDidMount() {
    invariant(this.currentPasswordInput, 'newPasswordInput ref unset');
    this.currentPasswordInput.focus();
  }

  render() {
    const { inputDisabled } = this.props;

    let errorMsg;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css.form_error}>{this.state.errorMessage}</div>
      );
    }

    return (
      <Modal name="Delete Account" onClose={this.props.popModal} size="large">
        <div className={css.modal_body}>
          <form method="POST">
            <SWMansionIcon icon="warning-circle" size={22} />
            <p className={css.deletion_warning}>
              Your account will be permanently deleted. There is no way to
              reverse this.
            </p>
            <p className={css.confirm_password}>
              Please enter your account password to confirm your identity.
            </p>
            <p className={css.form_title}>Account password</p>
            <Input
              type="password"
              placeholder="Password"
              value={this.state.currentPassword}
              onChange={this.onChangeCurrentPassword}
              disabled={inputDisabled}
              ref={this.currentPasswordInputRef}
            />
            <div className={css.form_footer}>
              <Button
                variant="filled"
                buttonColor="danger"
                type="submit"
                onClick={this.onDelete}
                disabled={inputDisabled}
              >
                Delete Account
              </Button>
              {errorMsg}
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  currentPasswordInputRef = (currentPasswordInput: ?HTMLInputElement) => {
    this.currentPasswordInput = currentPasswordInput;
  };

  onChangeCurrentPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ currentPassword: target.value });
  };

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
      this.props.popModal();
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
}

const deleteAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

const ConnectedAccountDeleteModal: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedAccountDeleteModal(): React.Node {
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const inputDisabled = useSelector(
      state => deleteAccountLoadingStatusSelector(state) === 'loading',
    );
    const callDeleteAccount = useServerCall(deleteAccount);
    const dispatchActionPromise = useDispatchActionPromise();

    const modalContext = useModalContext();

    return (
      <AccountDeleteModal
        preRequestUserState={preRequestUserState}
        inputDisabled={inputDisabled}
        deleteAccount={callDeleteAccount}
        dispatchActionPromise={dispatchActionPromise}
        popModal={modalContext.popModal}
      />
    );
  },
);

export default ConnectedAccountDeleteModal;
