// @flow

import * as React from 'react';

import {
  useDeleteKeyserverAccount,
  deleteKeyserverAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';

import css from './account-delete-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

const deleteAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteKeyserverAccountActionTypes,
);

const AccountDeleteModal: React.ComponentType<{}> = React.memo<{}>(
  function AccountDeleteModal(): React.Node {
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const inputDisabled = useSelector(
      state => deleteAccountLoadingStatusSelector(state) === 'loading',
    );
    const callDeleteAccount = useDeleteKeyserverAccount();
    const dispatchActionPromise = useDispatchActionPromise();

    const { popModal } = useModalContext();

    const [errorMessage, setErrorMessage] = React.useState('');

    const errorMsg = React.useMemo(() => {
      if (!errorMessage) {
        return <div className={css.errorPlaceholder} />;
      }

      return <div className={css.form_error}>{errorMessage}</div>;
    }, [errorMessage]);

    const deleteAction = React.useCallback(async () => {
      try {
        setErrorMessage('');
        const response = await callDeleteAccount(preRequestUserState);
        popModal();
        return response;
      } catch (e) {
        setErrorMessage('unknown error');
        throw e;
      }
    }, [callDeleteAccount, preRequestUserState, popModal]);

    const onDelete = React.useCallback(
      (event: SyntheticEvent<HTMLButtonElement>) => {
        event.preventDefault();
        void dispatchActionPromise(
          deleteKeyserverAccountActionTypes,
          deleteAction(),
        );
      },
      [deleteAction, dispatchActionPromise],
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
        <div className={css.modal_body}>
          <form method="POST">
            <SWMansionIcon icon="warning-circle" size={22} />
            <p className={css.deletion_warning}>
              Your account will be permanently deleted. There is no way to
              reverse this.
            </p>
            {errorMsg}
          </form>
        </div>
      </Modal>
    );
  },
);

export default AccountDeleteModal;
