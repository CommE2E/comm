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
    <Modal name="Confirm leave thread" onClose={onClose}>
      <div className={css.modal_body}>
        <p>{`Are you sure you want to leave "${uiName}"?`}</p>
        <Button
          onClick={onConfirm}
          type="submit"
          variant="danger"
          className={css.leave_button}
        >
          Leave Thread
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
