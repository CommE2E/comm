// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from '../modals/modal.react.js';

function EmojiAvatarSelectionModal(): React.Node {
  const modalContext = useModalContext();
  return (
    <Modal
      name="Emoji avatar selection"
      size="large"
      onClose={modalContext.popModal}
    ></Modal>
  );
}

export default EmojiAvatarSelectionModal;
