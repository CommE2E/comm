// @flow

import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import css from '../../style.css';
import Modal from '../modal.react';

type Props = {
  +threadInfo: ThreadInfo,
  +onClose: () => void,
  +onConfirm: () => void,
};
function ConfirmLeaveThreadModal(props: Props): React.Node {
  const { threadInfo, onClose, onConfirm } = props;
  const { uiName } = threadInfo;

  return (
    <Modal name="Confirm leave thread" onClose={onClose}>
      <div className={css['modal-body']}>
        <p>
          {'Are you sure you want to leave "'}
          <span className={css['thread-name']}>{uiName}</span>
          {'"?'}
        </p>
        <div className={css['form-footer']}>
          <Button onClick={onConfirm} type="submit">
            Leave Thread
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
