// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './thread-settings-delete-confirmation-modal.css';
import Button from '../../../components/button.react.js';
import Modal from '../../modal.react.js';

type BaseProps = {
  +isDeletingRootChannel: boolean,
  +onConfirmation: () => void,
};

const ThreadDeleteConfirmationModal: React.ComponentType<BaseProps> =
  React.memo(function PushNotifModal({
    isDeletingRootChannel,
    onConfirmation,
  }): React.Node {
    const { popModal } = useModalContext();

    let deletionTargetText;
    if (isDeletingRootChannel) {
      deletionTargetText = 'Subchannels and threads';
    } else {
      deletionTargetText = 'Threads';
    }

    return (
      <Modal
        size="large"
        name="Warning"
        icon="warning-circle"
        withCloseButton={false}
        onClose={popModal}
      >
        <div className={css.container}>
          <p className={css.text}>
            {deletionTargetText} within this chat will also be permanently
            deleted. Are you sure you want to continue?
          </p>
          <div className={css.buttonContainer}>
            <Button variant="outline" onClick={popModal}>
              No
            </Button>
            <Button variant="filled" onClick={onConfirmation} type="submit">
              Yes
            </Button>
          </div>
        </div>
      </Modal>
    );
  });

export default ThreadDeleteConfirmationModal;
