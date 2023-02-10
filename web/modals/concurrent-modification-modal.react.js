// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Button from '../components/button.react.js';
import css from './concurrent-modification-modal.css';
import Modal from './modal.react.js';

type Props = {
  +onRefresh: () => void,
};

export default function ConcurrentModificationModal(props: Props): React.Node {
  const modalContext = useModalContext();

  return (
    <Modal name="Concurrent modification" onClose={modalContext.popModal}>
      <div className={css.modal_body}>
        <p>
          It looks like somebody is attempting to modify that field at the same
          time as you! Please refresh the entry and try again.
        </p>
        <Button
          variant="filled"
          onClick={props.onRefresh}
          type="submit"
          className={css.refresh_button}
        >
          Refresh entry
        </Button>
      </div>
    </Modal>
  );
}
