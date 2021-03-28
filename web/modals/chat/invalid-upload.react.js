// @flow

import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
|};
class InvalidUploadModal extends React.PureComponent<Props> {
  render(): React.Node {
    return (
      <Modal name="Invalid upload" onClose={this.clearModal}>
        <div className={css['modal-body']}>
          <p>We don&apos;t support that file type yet :(</p>
        </div>
      </Modal>
    );
  }

  clearModal: () => void = () => {
    this.props.setModal(null);
  };
}

export default InvalidUploadModal;
