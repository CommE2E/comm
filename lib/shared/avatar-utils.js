// @flow

import invariant from 'invariant';
import stringHash from 'string-hash';

import { selectedThreadColors } from './thread-utils.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import type { ClientEmojiAvatar, ClientAvatar } from '../types/avatar-types.js';
import { type ThreadType, threadTypes } from '../types/thread-types.js';
import { useResolvedOptionalThreadInfo } from '../utils/entity-helpers.js';
import type { EntityTextComponent } from '../utils/entity-text.js';
import { useSelector } from '../utils/redux-utils.js';

const defaultAnonymousUserEmojiAvatar: ClientEmojiAvatar = {
  color: selectedThreadColors[4],
  emoji: '👤',
  type: 'emoji',
};

const defaultEmojiAvatars: $ReadOnlyArray<ClientEmojiAvatar> = [
  { color: selectedThreadColors[7], emoji: '😀', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '😆', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🤩', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🏈', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '👻', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🧑‍🚀', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🎩', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🍦', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🚀', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🥰', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🐬', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🍀', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🍕', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🙄', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🥳', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🥸', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🦋', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🏆', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🎲', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🏀', type: 'emoji' },
];

function getDefaultAvatar(hashKey: string, color?: string): ClientEmojiAvatar {
  const avatarIndex = stringHash(hashKey) % defaultEmojiAvatars.length;

  return {
    ...defaultEmojiAvatars[avatarIndex],
    color: color ? color : defaultEmojiAvatars[avatarIndex].color,
  };
}

function getAvatarForUser(
  user: ?{ +avatar?: ?ClientAvatar, +username?: ?string, ... },
): ClientAvatar {
  if (user?.avatar) {
    return user.avatar;
  }

  if (!user?.username) {
    return defaultAnonymousUserEmojiAvatar;
  }

  return getDefaultAvatar(user.username);
}

function getAvatarForThreadEntity(
  threadEntity: EntityTextComponent,
): ?ClientAvatar {
  if (threadEntity.type !== 'thread' || typeof threadEntity === 'string') {
    return null;
  }
  if (threadEntity.display !== 'uiName') {
    return null;
  }

  const { uiName } = threadEntity;
  if (typeof uiName === 'string') {
    return null;
  }

  const userEntity = uiName.find(innerEntity => !innerEntity.isViewer);
  if (!userEntity) {
    return null;
  }

  return getAvatarForUser(userEntity);
}

function useGetAvatarForThread(
  thread: ?{
    +id: string,
    +type: ThreadType,
    +avatar?: ?ClientAvatar,
    +color: string,
    +parentThreadID: ?string,
    ...
  },
): ClientAvatar {
  const viewer = useSelector(state => state.currentUserInfo);

  const parentThreadID = thread?.parentThreadID;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const resolvedParentThreadInfo =
    useResolvedOptionalThreadInfo(parentThreadInfo);

  if (!thread) {
    return defaultAnonymousUserEmojiAvatar;
  }

  if (thread.avatar) {
    return thread.avatar;
  }

  if (thread.type === threadTypes.SIDEBAR) {
    invariant(
      resolvedParentThreadInfo,
      'parentThreadInfo should be set for sidebars',
    );

    return resolvedParentThreadInfo.avatar
      ? resolvedParentThreadInfo.avatar
      : getDefaultAvatar(
          resolvedParentThreadInfo.id,
          resolvedParentThreadInfo.color,
        );
  }

  if (thread.type === threadTypes.PRIVATE) {
    return getAvatarForUser(viewer);
  }

  return getDefaultAvatar(thread.id, thread.color);
}

export { getAvatarForUser, getAvatarForThreadEntity, useGetAvatarForThread };
