// @flow

import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types';

import Button, { buttonThemes } from '../../components/button.react';
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
    <Modal
      size="fit-content"
      name="Leaving channel"
      icon="warning-circle"
      withCloseButton={false}
      onClose={onClose}
    >
      <div className={css.container}>
        <p>
          {'Are you sure you want to leave "'}
          <span className={css['thread-name']}>{uiName}</span>
          {'"?'}
        </p>
        <div className={css.buttonContainer}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="filled"
            buttonColor={buttonThemes.danger}
            onClick={onConfirm}
            type="submit"
          >
            Yes, leave chat
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
