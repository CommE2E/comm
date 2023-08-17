// @flow
import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import {
  defaultAnonymousUserEmojiAvatar,
  getAvatarForUser,
  getDefaultAvatar,
} from 'lib/shared/avatar-utils.js';
import type {
  ClientAvatar,
  ClientEmojiAvatar,
} from 'lib/types/avatar-types.js';

import EmojiAvatarSelectionModal from './emoji-avatar-selection-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function UserEmojiAvatarSelectionModal(): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { baseSetUserAvatar, userAvatarSaveInProgress } = editUserAvatarContext;

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const currentUserAvatar: ClientAvatar = getAvatarForUser(currentUserInfo);

  const defaultUserAvatar: ClientEmojiAvatar = currentUserInfo?.username
    ? getDefaultAvatar(currentUserInfo.username)
    : defaultAnonymousUserEmojiAvatar;

  return (
    <EmojiAvatarSelectionModal
      currentAvatar={currentUserAvatar}
      defaultAvatar={defaultUserAvatar}
      setEmojiAvatar={baseSetUserAvatar}
      avatarSaveInProgress={userAvatarSaveInProgress}
    />
  );
}

export default UserEmojiAvatarSelectionModal;
