// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import Modal from '../modal.react';
import css from '../../style.css';

type Props = {|
  setModal: (modal: ?React.Node) => void,
|};
class InvalidUploadModal extends React.PureComponent<Props> {

  static propTypes = {
    setModal: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Modal name="Invalid upload" onClose={this.clearModal}>
        <div className={css['modal-body']}>
          <p>
            We don't support that file type yet :(
          </p>
        </div>
      </Modal>
    );
  }

  clearModal = () => {
    this.props.setModal(null);
  }

}

export default InvalidUploadModal;
