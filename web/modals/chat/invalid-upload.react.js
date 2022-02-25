// @flow

import * as React from 'react';

import { useModalContext } from '../../modals/modal-provider.react';
import css from '../../style.css';
import Modal from '../modal.react';

type Props = {
  +clearModal: () => void,
};
class InvalidUploadModal extends React.PureComponent<Props> {
  render(): React.Node {
    return (
      <Modal name="Invalid upload" onClose={this.props.clearModal}>
        <div className={css['modal-body']}>
          <p>We don&apos;t support that file type yet :(</p>
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
