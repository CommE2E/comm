// @flow

import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +onClose: () => void,
|};
function CantLeaveThreadModal(props: Props): React.Node {
  return (
    <Modal name="Cannot leave thread" onClose={props.onClose}>
      <div className={css['modal-body']}>
        <p>
          You are the only admin left of this thread. Please promote somebody
          else to admin before leaving.
        </p>
      </div>
    </Modal>
  );
}

export default CantLeaveThreadModal;
