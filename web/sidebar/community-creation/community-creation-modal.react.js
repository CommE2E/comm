// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './community-creation-modal.css';
import Modal from '../../modals/modal.react.js';

function CommunityCreationModal(): React.Node {
  const modalContext = useModalContext();

  return (
    <Modal
      name="Create a community"
      onClose={modalContext.popModal}
      size="small"
    >
      <div className={css.modal_body}></div>
    </Modal>
  );
}

export default CommunityCreationModal;
