// @flow

import * as React from 'react';

import {
  deleteAccount,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LogOutResult } from 'lib/types/account-types.js';
import type { PreRequestUserState } from 'lib/types/session-types.js';
import type { DispatchActionPromise } from 'lib/utils/action-utils.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import css from './account-delete-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +preRequestUserState: PreRequestUserState,
  +inputDisabled: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +deleteAccount: (
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
  +popModal: () => void,
};
type State = {
  +errorMessage: string,
};

class AccountDeleteModal extends React.PureComponent<Props, State> {
  state = {
    errorMessage: '',
  };

  render() {
    let errorMsg;
    if (this.state.errorMessage) {
      errorMsg = (
        <div className={css.form_error}>{this.state.errorMessage}</div>
      );
    }

    const { inputDisabled } = this.props;
    return (
      <Modal name="Delete Account" onClose={this.props.popModal} size="large">
        <div className={css.modal_body}>
          <form method="POST">
            <SWMansionIcon icon="warning-circle" size={22} />
            <p className={css.deletion_warning}>
              Your account will be permanently deleted. There is no way to
              reverse this.
            </p>
            <div className={css.form_footer}>
              <Button
                variant="filled"
                buttonColor={buttonThemes.danger}
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
        this.props.preRequestUserState,
      );
      this.props.popModal();
      return response;
    } catch (e) {
      this.setState({ errorMessage: 'unknown error' });
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
