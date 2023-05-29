// @flow

import invariant from 'invariant';
import * as React from 'react';

import { savedEmojiAvatarSelectorForThread } from 'lib/selectors/thread-selectors.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import { EditThreadAvatarContext } from '../../avatars/edit-thread-avatar-provider.react.js';
import EmojiAvatarCreation from '../../avatars/emoji-avatar-creation.react.js';
import type { ChatNavigationProp } from '../../chat/chat.react.js';
import { displayActionResultModal } from '../../navigation/action-result-modal.js';
import type { NavigationRoute } from '../../navigation/route-names.js';

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

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { setThreadAvatar, threadAvatarSaveInProgress } =
    editThreadAvatarContext;
  const setAvatar = React.useCallback(
    async avatarRequest => {
      const result = await setThreadAvatar(threadID, avatarRequest);
      displayActionResultModal('Avatar updated!');
      return result;
    },
    [setThreadAvatar, threadID],
  );

  return (
    <EmojiAvatarCreation
      saveAvatarCall={setAvatar}
      saveAvatarCallLoading={threadAvatarSaveInProgress}
      savedEmojiAvatarSelector={selector}
    />
  );
}

export default EmojiThreadAvatarCreation;
