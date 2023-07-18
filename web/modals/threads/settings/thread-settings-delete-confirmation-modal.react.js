// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './thread-settings-delete-confirmation-modal.css';
import Button from '../../../components/button.react.js';
import Modal from '../../modal.react.js';

type BaseProps = {
  +isCommunityRoot: boolean,
  +onConfirmation: () => void,
};

function ThreadDeleteConfirmationModal({
  isCommunityRoot,
  onConfirmation,
}: BaseProps): React.Node {
  const { popModal } = useModalContext();
  const deletionTargetText = React.useMemo(
    () => (isCommunityRoot ? 'Subchannels and threads' : 'Threads'),
    [isCommunityRoot],
  );

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
          {deletionTargetText} within this community will also be permanently
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
}

export default ThreadDeleteConfirmationModal;
