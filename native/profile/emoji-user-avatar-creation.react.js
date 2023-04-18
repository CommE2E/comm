// @flow

import * as React from 'react';

import { updateUserAvatarActionTypes } from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { savedEmojiAvatarSelectorForCurrentUser } from 'lib/selectors/user-selectors.js';

import EmojiAvatarCreation from '../avatars/emoji-avatar-creation.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useSaveUserAvatar } from '../utils/avatar-utils.js';

const userAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

// eslint-disable-next-line no-unused-vars
function EmojiUserAvatarCreation(props: { ... }): React.Node {
  const saveUserAvatar = useSaveUserAvatar();
  const saveUserAvatarCallLoading = useSelector(
    state => userAvatarLoadingStatusSelector(state) === 'loading',
  );

  return (
    <EmojiAvatarCreation
      saveAvatarCall={saveUserAvatar}
      saveAvatarCallLoading={saveUserAvatarCallLoading}
      savedEmojiAvatarSelector={savedEmojiAvatarSelectorForCurrentUser}
    />
  );
}

export default EmojiUserAvatarCreation;
