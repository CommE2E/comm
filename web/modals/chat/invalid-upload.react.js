// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ModalContext } from '../../modals/modal-provider.react';
import css from '../../style.css';
import Modal from '../modal.react';

function InvalidUploadModal(): React.Node {
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'ModalContext not found');

  return (
    <Modal name="Invalid upload" onClose={modalContext.clearModal}>
      <div className={css['modal-body']}>
        <p>We don&apos;t support that file type yet :(</p>
      </div>
    </Modal>
  );
}

export default InvalidUploadModal;
