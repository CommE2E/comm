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
  const { onClose, onConfirm } = props;

  return (
    <Modal name="Leaving channel" onClose={onClose}>
      <div className={css['modal-body']}>
        <p>
          Are you sure you want to leave thread? This and this will happen if
          you do so.
        </p>
        <div className={css['form-footer']}>
          <Button onClick={onConfirm} type="submit">
            Yes, leave Thread
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
