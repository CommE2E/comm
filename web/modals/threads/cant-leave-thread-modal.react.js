// @flow

import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +onClose: () => void,
|};

class CantLeaveThreadModal extends React.PureComponent<Props> {
  render() {
    return (
      <Modal name="Cannot leave thread" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <p>
            You are the only admin left of this thread. Please promote somebody
            else to admin before leaving.
          </p>
        </div>
      </Modal>
    );
  }
}

export default CantLeaveThreadModal;
