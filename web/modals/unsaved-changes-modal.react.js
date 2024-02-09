// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from './modal.react.js';
import css from './unsaved-changes-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';

function UnsavedChangesModal(): React.Node {
  const { popModal } = useModalContext();

  const onCloseModalClick = React.useCallback(() => {
    // Pop the unsaved changes modal and the modal that triggered it.
    popModal();
    popModal();
  }, [popModal]);

  const primaryButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        className={css.unsavedChangesCloseModalButton}
        buttonColor={buttonThemes.danger}
        onClick={onCloseModalClick}
      >
        Close Modal
      </Button>
    ),
    [onCloseModalClick],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button
        variant="outline"
        className={css.unsavedChangesBackButton}
        onClick={popModal}
      >
        Back
      </Button>
    ),
    [popModal],
  );

  const unsavedChangesModal = React.useMemo(
    () => (
      <Modal
        onClose={popModal}
        withCloseButton={false}
        size="large"
        primaryButton={primaryButton}
        secondaryButton={secondaryButton}
      >
        <div className={css.unsavedChangesModalText}>
          You have unsaved changes. Are you sure you want to close the modal?
          You will lose all your progress.
        </div>
      </Modal>
    ),
    [popModal, primaryButton, secondaryButton],
  );

  return unsavedChangesModal;
}

export default UnsavedChangesModal;
