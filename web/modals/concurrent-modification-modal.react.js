// @flow

import invariant from 'invariant';
import * as React from 'react';

import css from '../style.css';
import { ModalContext } from './modal-provider.react';
import Modal from './modal.react';

type Props = {
  +onRefresh: () => void,
};

export default function ConcurrentModificationModal(props: Props): React.Node {
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'modalContext not set');

  return (
    <Modal name="Concurrent modification" clearModal={modalContext.clearModal}>
      <div className={css['modal-body']}>
        <p>
          It looks like somebody is attempting to modify that field at the same
          time as you! Please refresh the entry and try again.
        </p>
        <div className={css['form-footer']}>
          <input
            type="submit"
            value="Refresh entry"
            onClick={props.onRefresh}
          />
        </div>
      </div>
    </Modal>
  );
}
