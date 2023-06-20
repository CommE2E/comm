// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  defaultAnonymousUserEmojiAvatar,
  getAvatarForUser,
  getDefaultAvatar,
} from 'lib/shared/avatar-utils.js';
import type {
  ClientAvatar,
  ClientEmojiAvatar,
} from 'lib/types/avatar-types.js';

import Avatar from './avatar.react.js';
import css from './emoji-avatar-selection-modal.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function EmojiAvatarSelectionModal(): React.Node {
  const modalContext = useModalContext();

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const currentUserAvatar: ClientAvatar = getAvatarForUser(currentUserInfo);
  const defaultUserAvatar: ClientEmojiAvatar = currentUserInfo?.username
    ? getDefaultAvatar(currentUserInfo.username)
    : defaultAnonymousUserEmojiAvatar;

  // eslint-disable-next-line no-unused-vars
  const [pendingUserAvatar, setPendingUserAvatar] =
    React.useState<ClientEmojiAvatar>(
      currentUserAvatar.type === 'emoji'
        ? currentUserAvatar
        : defaultUserAvatar,
    );

  return (
    <Modal
      name="Emoji avatar selection"
      size="large"
      onClose={modalContext.popModal}
    >
      <div className={css.modalBody}>
        <div className={css.avatarContainer}>
          <Avatar avatarInfo={pendingUserAvatar} size="profile" />
        </div>
      </div>
    </Modal>
  );
}

export default EmojiAvatarSelectionModal;
