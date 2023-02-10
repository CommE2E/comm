// @flow

import * as React from 'react';

import Button from '../../components/button.react.js';
import Modal from '../modal.react.js';
import css from './cant-leave-thread-modal.css';

type Props = {
  +onClose: () => void,
};
function CantLeaveThreadModal(props: Props): React.Node {
  return (
    <Modal name="Cannot leave chat" onClose={props.onClose}>
      <div className={css.modal_body}>
        <p>
          You are the only admin left of this chat. Please promote somebody else
          to admin before leaving.
        </p>
        <Button
          onClick={props.onClose}
          type="submit"
          variant="filled"
          className={css.ok_button}
        >
          OK
        </Button>
      </div>
    </Modal>
  );
}

export default CantLeaveThreadModal;
