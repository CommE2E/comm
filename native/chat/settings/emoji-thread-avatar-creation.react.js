// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { savedEmojiAvatarSelectorForThread } from 'lib/selectors/thread-selectors.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import { useNativeSetThreadAvatar } from '../../avatars/avatar-hooks.js';
import EmojiAvatarCreation from '../../avatars/emoji-avatar-creation.react.js';
import type { ChatNavigationProp } from '../../chat/chat.react.js';
import { displayActionResultModal } from '../../navigation/action-result-modal.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';

export type EmojiThreadAvatarCreationParams = {
  +threadInfo: RawThreadInfo | ThreadInfo,
};

type Props = {
  +navigation: ChatNavigationProp<'EmojiThreadAvatarCreation'>,
  +route: NavigationRoute<'EmojiThreadAvatarCreation'>,
};

function EmojiThreadAvatarCreation(props: Props): React.Node {
  const { id: threadID, containingThreadID } = props.route.params.threadInfo;

  const selector = savedEmojiAvatarSelectorForThread(
    threadID,
    containingThreadID,
  );
  const savedEmojiAvatarFunc = useSelector(selector);

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');
  const { threadAvatarSaveInProgress } = editThreadAvatarContext;

  const nativeSetThreadAvatar = useNativeSetThreadAvatar();

  const setAvatar = React.useCallback(
    async avatarRequest => {
      const result = await nativeSetThreadAvatar(threadID, avatarRequest);
      displayActionResultModal('Avatar updated!');
      return result;
    },
    [nativeSetThreadAvatar, threadID],
  );

  return (
    <EmojiAvatarCreation
      saveAvatarCall={setAvatar}
      saveAvatarCallLoading={threadAvatarSaveInProgress}
      savedEmojiAvatarFunc={savedEmojiAvatarFunc}
    />
  );
}

export default EmojiThreadAvatarCreation;
