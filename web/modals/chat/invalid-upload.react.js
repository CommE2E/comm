// @flow

import * as React from 'react';

import Button from '../../components/button.react.js';
import { useModalContext } from '../../modals/modal-provider.react';
import Modal from '../modal.react';
import css from './invalid-upload.css';

type Props = {
  +clearModal: () => void,
};
class InvalidUploadModal extends React.PureComponent<Props> {
  render(): React.Node {
    return (
      <Modal name="Invalid upload" onClose={this.props.clearModal}>
        <div className={css.modal_body}>
          <p>We don&apos;t support that file type yet :(</p>
          <Button
            onClick={this.props.clearModal}
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
}

function ConnectedInvalidUploadModal(): React.Node {
  const modalContext = useModalContext();

  return <InvalidUploadModal clearModal={modalContext.clearModal} />;
}

export default ConnectedInvalidUploadModal;
