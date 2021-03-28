// @flow

import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +threadInfo: ThreadInfo,
  +onClose: () => void,
  +onConfirm: () => void,
|};
function ConfirmLeaveThreadModal(props: Props): React.Node {
  return (
    <Modal name="Confirm leave thread" onClose={props.onClose}>
      <div className={css['modal-body']}>
        <p>
          {'Are you sure you want to leave "'}
          <span className={css['thread-name']}>
            {props.threadInfo.uiName}
          </span>
          {'"?'}
        </p>
        <div className={css['form-footer']}>
          <input
            type="submit"
            value="Leave thread"
            onClick={props.onConfirm}
          />
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmLeaveThreadModal;
