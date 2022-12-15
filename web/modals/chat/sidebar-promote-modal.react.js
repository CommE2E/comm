// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import Modal from '../modal.react';
import css from './sidebar-promote-modal.css';

type Props = {
  +onClose: () => void,
  +onConfirm: () => void,
  +threadInfo: ThreadInfo,
};

function SidebarPromoteModal(props: Props): React.Node {
  const { threadInfo, onClose, onConfirm } = props;
  const { uiName } = threadInfo;

  const handleConfirm = React.useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

  return (
    <Modal
      size="large"
      name="Promote to channel"
      icon="warning-circle"
      onClose={onClose}
    >
      <div className={css.modal_body}>
        <p>
          {`Are you sure you want to promote "${uiName}"? 
          Promoting a thread to a channel cannot be undone.`}
        </p>
        <div className={css.buttonContainer}>
          <Button onClick={onClose} type="submit" variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirm} type="submit" variant="filled">
            Promote to channel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SidebarPromoteModal;
