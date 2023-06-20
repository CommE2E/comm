// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from '../modals/modal.react.js';

function EmojiAvatarSelectionModal(): React.Node {
  const { popModal } = useModalContext();
  return (
    <Modal
      name="Emoji avatar selection"
      size="large"
      onClose={popModal}
    ></Modal>
  );
}

export default EmojiAvatarSelectionModal;
