// @flow

import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
|};

function FailedSendModal({ setModal }: Props) {
  const clearModal = React.useCallback(() => setModal(null), [setModal]);

  return (
    <Modal onClose={clearModal} name="Failed send">
      <div className={css['modal-body']}>
        <p>Something went wrong while sending the message. Please try again.</p>
      </div>
    </Modal>
  );
}

export default FailedSendModal;
