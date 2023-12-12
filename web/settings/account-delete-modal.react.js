// @flow

import * as React from 'react';

import {
  useDeleteKeyserverAccount,
  deleteKeyserverAccountActionTypes,
  useDeleteIdentityAccount,
  deleteIdentityAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import css from './account-delete-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

const deleteKeyserverAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteKeyserverAccountActionTypes,
);
const deleteIdentityAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteIdentityAccountActionTypes,
);

const AccountDeleteModal: React.ComponentType<{}> = React.memo<{}>(
  function AccountDeleteModal(): React.Node {
    const isDeleteKeyserverAccountLoading = useSelector(
      state => deleteKeyserverAccountLoadingStatusSelector(state) === 'loading',
    );
    const isDeleteIdentityAccountLoading = useSelector(
      state => deleteIdentityAccountLoadingStatusSelector(state) === 'loading',
    );
    const inputDisabled =
      isDeleteKeyserverAccountLoading || isDeleteIdentityAccountLoading;

    const callDeleteIdentityAccount = useDeleteIdentityAccount();
    const callDeleteKeyserverAccount = useDeleteKeyserverAccount();

    const dispatchActionPromise = useDispatchActionPromise();

    const { popModal } = useModalContext();

    const [keyserverErrorMessage, setKeyserverErrorMessage] =
      React.useState('');
    const [identityErrorMessage, setIdentityErrorMessage] = React.useState('');

    const keyserverError = keyserverErrorMessage ? (
      <p>{keyserverErrorMessage}</p>
    ) : null;
    const identityError = identityErrorMessage ? (
      <p>{identityErrorMessage}</p>
    ) : null;
    let combinedErrorMessages;
    if (keyserverError || identityError) {
      combinedErrorMessages = (
        <div className={css.formError}>
          {keyserverError}
          {identityError}
        </div>
      );
    }

    const deleteKeyserverAction = React.useCallback(async () => {
      try {
        setKeyserverErrorMessage('');
        const response = await callDeleteKeyserverAccount();
        // This check ensures that we don't call `popModal()` twice
        if (!usingCommServicesAccessToken) {
          popModal();
        }
        return response;
      } catch (e) {
        setKeyserverErrorMessage(
          'unknown error deleting account from keyserver',
        );
        throw e;
      }
    }, [callDeleteKeyserverAccount, popModal]);

    const deleteIdentityAction = React.useCallback(async () => {
      try {
        setIdentityErrorMessage('');
        const response = await callDeleteIdentityAccount();
        popModal();
        return response;
      } catch (e) {
        setIdentityErrorMessage(
          'unknown error deleting account from identity service',
        );
        throw e;
      }
    }, [callDeleteIdentityAccount, popModal]);

    const onDelete = React.useCallback(
      (event: SyntheticEvent<HTMLButtonElement>) => {
        event.preventDefault();
        void dispatchActionPromise(
          deleteKeyserverAccountActionTypes,
          deleteKeyserverAction(),
        );
        if (usingCommServicesAccessToken) {
          void dispatchActionPromise(
            deleteIdentityAccountActionTypes,
            deleteIdentityAction(),
          );
        }
      },
      [deleteIdentityAction, deleteKeyserverAction, dispatchActionPromise],
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
            <SWMansionIcon icon="warning-circle" size={22} />
            <p className={css.deletionWarning}>
              Your account will be permanently deleted. There is no way to
              reverse this.
            </p>
            {combinedErrorMessages}
          </form>
        </div>
      </Modal>
    );
  },
);

export default AccountDeleteModal;
