// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';
import { savedEmojiAvatarSelectorForCurrentUser } from 'lib/selectors/user-selectors.js';

import { useNativeSetUserAvatar } from '../avatars/avatar-hooks.js';
import EmojiAvatarCreation from '../avatars/emoji-avatar-creation.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import { useSelector } from '../redux/redux-utils.js';

// eslint-disable-next-line no-unused-vars
function EmojiUserAvatarCreation(props: { ... }): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { userAvatarSaveInProgress } = editUserAvatarContext;

  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const setAvatar = React.useCallback(
    async avatarRequest => {
      const result = await nativeSetUserAvatar(avatarRequest);
      displayActionResultModal('Avatar updated!');
      return result;
    },
    [nativeSetUserAvatar],
  );

  const savedEmojiAvatarFunc = useSelector(
    savedEmojiAvatarSelectorForCurrentUser,
  );

  return (
    <EmojiAvatarCreation
      saveAvatarCall={setAvatar}
      saveAvatarCallLoading={userAvatarSaveInProgress}
      savedEmojiAvatarFunc={savedEmojiAvatarFunc}
    />
  );
}

export default EmojiUserAvatarCreation;
