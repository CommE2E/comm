// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {
  threadInfo: ThreadInfo,
  onClose: () => void,
  onConfirm: () => void,
};

class ConfirmLeaveThreadModal extends React.PureComponent<Props> {
  render() {
    return (
      <Modal name="Confirm leave thread" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <p>
            {'Are you sure you want to leave "'}
            <span className={css['thread-name']}>
              {this.props.threadInfo.uiName}
            </span>
            {'"?'}
          </p>
          <div className={css['form-footer']}>
            <input
              type="submit"
              value="Leave thread"
              onClick={this.props.onConfirm}
            />
          </div>
        </div>
      </Modal>
    );
  }
}

ConfirmLeaveThreadModal.propTypes = {
  threadInfo: threadInfoPropType.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmLeaveThreadModal;
