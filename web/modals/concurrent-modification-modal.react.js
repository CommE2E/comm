// @flow

import * as React from 'react';

import Button from '../components/button.react';
import css from '../style.css';
import { useModalContext } from './modal-provider.react';
import Modal from './modal.react';

type Props = {
  +onRefresh: () => void,
};

export default function ConcurrentModificationModal(props: Props): React.Node {
  const modalContext = useModalContext();

  return (
    <Modal name="Concurrent modification" onClose={modalContext.clearModal}>
      <div className={css['modal-body']}>
        <p>
          It looks like somebody is attempting to modify that field at the same
          time as you! Please refresh the entry and try again.
        </p>
        <div className={css['form-footer']}>
          <Button onClick={props.onRefresh} type="submit">
            Refresh entry
          </Button>
        </div>
      </div>
    </Modal>
  );
}
