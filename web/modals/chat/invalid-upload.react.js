// @flow

import * as React from 'react';

import Button from '../../components/button.react.js';
import { useModalContext } from '../../modals/modal-provider.react';
import Modal from '../modal.react';
import css from './invalid-upload.css';

function InvalidUploadModal(): React.Node {
  const { popModal } = useModalContext();
  return (
    <Modal name="Invalid upload" onClose={popModal}>
      <div className={css.modal_body}>
        <p>We don&apos;t support that file type yet :(</p>
        <Button
          onClick={popModal}
          type="submit"
          variant="primary"
          className={css.ok_button}
        >
          OK
        </Button>
      </div>
    </Modal>
  );
}

export default InvalidUploadModal;
