// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from './modal.react.js';
import css from './unsaved-changes-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';

function UnsavedChangesModal(): React.Node {
  const modalName = '';
  const { popModal } = useModalContext();

  const onCloseModalClick = React.useCallback(() => {
    // Pop the unsaved changes modal and the modal that triggered it.
    popModal();
    popModal();
  }, [popModal]);

  return (
    <Modal
      name={modalName}
      onClose={popModal}
      withCloseButton={false}
      size="large"
    >
      <div className={css.unsavedChangesModalText}>
        You have unsaved changes, are you sure you want to close the modal? You
        will lose all your progress.
      </div>
      <div className={css.unsavedChangesModalButtons}>
        <Button
          variant="outline"
          className={css.unsavedChangesBackButton}
          onClick={popModal}
        >
          Back
        </Button>
        <Button
          variant="filled"
          className={css.unsavedChangesCloseModalButton}
          buttonColor={buttonThemes.danger}
          onClick={onCloseModalClick}
        >
          Close Modal
        </Button>
      </div>
    </Modal>
  );
}

export default UnsavedChangesModal;
