// @flow

import * as React from 'react';

import {
  useDeleteWalletAccount as useDeleteAccount,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './account-delete-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

const deleteAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

const AccountDeleteModal: React.ComponentType<{}> = React.memo<{}>(
  function AccountDeleteModal(): React.Node {
    const inputDisabled = useSelector(
      state => deleteAccountLoadingStatusSelector(state) === 'loading',
    );

    const callDeleteAccount = useDeleteAccount();
    const dispatchActionPromise = useDispatchActionPromise();
    const { popModal } = useModalContext();

    const [errorMessage, setErrorMessage] = React.useState('');
    let error;
    if (errorMessage) {
      error = (
        <div className={css.formError}>
          <p>{errorMessage}</p>
        </div>
      );
    }

    const deleteAccountAction = React.useCallback(async () => {
      try {
        setErrorMessage('');
        const response = await callDeleteAccount();
        popModal();
        return response;
      } catch (e) {
        setErrorMessage('unknown error deleting account');
        throw e;
      }
    }, [callDeleteAccount, popModal]);

    const onDelete = React.useCallback(
      (event: SyntheticEvent<HTMLButtonElement>) => {
        event.preventDefault();
        void dispatchActionPromise(
          deleteAccountActionTypes,
          deleteAccountAction(),
        );
      },
      [deleteAccountAction, dispatchActionPromise],
    );

    const primaryButton = React.useMemo(
      () => (
        <Button
          variant="filled"
          buttonColor={buttonThemes.danger}
          type="submit"
          onClick={onDelete}
          disabled={inputDisabled}
        >
          Delete Account
        </Button>
      ),
      [inputDisabled, onDelete],
    );

    return (
      <Modal
        name="Delete Account"
        onClose={popModal}
        size="large"
        primaryButton={primaryButton}
      >
        <div className={css.modalBody}>
          <form method="POST">
            <div className={css.infoContainer}>
              <SWMansionIcon icon="warning-circle" size={22} />
              <p className={css.deletionWarning}>
                Your account will be permanently deleted. There is no way to
                reverse this.
              </p>
            </div>
            {error}
          </form>
        </div>
      </Modal>
    );
  },
);

export default AccountDeleteModal;
