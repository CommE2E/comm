// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './version-unsupported-modal.css';
import Modal from '../modals/modal.react.js';
import { getVersionUnsupportedError } from '../utils/version-utils.js';

function VersionUnsupportedModal(): React.Node {
  const { popModal } = useModalContext();
  const message = getVersionUnsupportedError();
  return (
    <Modal name="App version unsupported" onClose={popModal} size="large">
      <div className={css.modalContent}>{message}</div>
    </Modal>
  );
}

export default VersionUnsupportedModal;
