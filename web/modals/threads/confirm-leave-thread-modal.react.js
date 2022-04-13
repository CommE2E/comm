// @flow

import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import Modal from '../modal.react';
import css from './confirm-leave-thread-modal.css';

type Props = {
  +threadInfo: ThreadInfo,
  +onClose: () => void,
  +onConfirm: () => void,
};
function ConfirmLeaveThreadModal(props: Props): React.Node {
  const { threadInfo, onClose, onConfirm } = props;
  const { uiName } = threadInfo;

  return (
    <Modal name="Leaving channel" icon="warning-circle" onClose={onClose}>
      <div className={css.container}>
        <p>
          {'Are you sure you want to leave "'}
          <span className={css['thread-name']}>{uiName}</span>
          {'"?'}
        </p>
        <div className={css.buttonContainer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} type="submit">
            Yes, leave Thread
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
