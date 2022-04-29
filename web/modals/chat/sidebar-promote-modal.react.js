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
      name="Promote Thread"
      icon="warning-circle"
      onClose={onClose}
    >
      <div className={css.modal_body}>
        <p>{`Are you sure you want to promote "${uiName}"?`}</p>
        <p>Promoting a sidebar to a full thread cannot be undone.</p>
        <div className={css.buttonContainer}>
          <Button onClick={onClose} type="submit" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} type="submit" variant="danger">
            Promote to Full Thread
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SidebarPromoteModal;
