// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import {
  getDefaultAvatar,
  useAvatarForThread,
} from 'lib/shared/avatar-utils.js';
import type {
  ClientAvatar,
  ClientEmojiAvatar,
} from 'lib/types/avatar-types.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import EmojiAvatarSelectionModal from './emoji-avatar-selection-modal.react.js';

type Props = {
  +threadInfo: ThreadInfo | RawThreadInfo,
};

function ThreadEmojiAvatarSelectionModal(props: Props): React.Node {
  const { threadInfo } = props;
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { baseSetThreadAvatar, threadAvatarSaveInProgress } =
    editThreadAvatarContext;

  const currentThreadAvatar: ClientAvatar = useAvatarForThread(threadInfo);
  const defaultThreadAvatar: ClientEmojiAvatar = getDefaultAvatar(
    threadInfo.id,
    threadInfo.color,
  );

  const setEmojiAvatar = React.useCallback(
    (pendingEmojiAvatar: ClientEmojiAvatar): Promise<void> =>
      baseSetThreadAvatar(threadInfo.id, pendingEmojiAvatar),
    [baseSetThreadAvatar, threadInfo.id],
  );

  return (
    <EmojiAvatarSelectionModal
      currentAvatar={currentThreadAvatar}
      defaultAvatar={defaultThreadAvatar}
      setEmojiAvatar={setEmojiAvatar}
      avatarSaveInProgress={threadAvatarSaveInProgress}
    />
  );
}

export default ThreadEmojiAvatarSelectionModal;
