// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react';
import { useModalContext } from 'lib/components/modal-provider.react';

import css from './investor-profile-modal.css';

function InvestorProfileModal(): React.Node {
  const { popModal } = useModalContext();

  return (
    <ModalOverlay onClose={popModal}>
      <div className={css.modalContainer} />
    </ModalOverlay>
  );
}

export default InvestorProfileModal;
