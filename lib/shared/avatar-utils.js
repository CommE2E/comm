// @flow

import invariant from 'invariant';
import stringHash from 'string-hash';

import { selectedThreadColors } from './color-utils.js';
import { threadOtherMembers } from './thread-utils.js';
import genesis from '../facts/genesis.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import type { ClientEmojiAvatar, ClientAvatar } from '../types/avatar-types.js';
import {
  type RawThreadInfo,
  type ThreadInfo,
  threadTypes,
} from '../types/thread-types.js';
import type { UserInfos } from '../types/user-types.js';
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

function getUserAvatarForThread(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ClientAvatar {
  if (threadInfo.type === threadTypes.PRIVATE) {
    invariant(viewerID, 'viewerID should be set for PRIVATE threads');
    return getAvatarForUser(userInfos[viewerID]);
  }

  invariant(
    threadInfo.type === threadTypes.PERSONAL,
    'threadInfo should be a PERSONAL type',
  );

  const memberInfos = threadOtherMembers(threadInfo.members, viewerID)
    .map(member => userInfos[member.id] && userInfos[member.id])
    .filter(Boolean);

  if (memberInfos.length === 0) {
    return defaultAnonymousUserEmojiAvatar;
  }

  return getAvatarForUser(memberInfos[0]);
}

function useGetAvatarForThread(
  thread: RawThreadInfo | ThreadInfo,
): ClientAvatar {
  const containingThreadID = thread.containingThreadID;
  const containingThreadInfo = useSelector(state =>
    containingThreadID ? threadInfoSelector(state)[containingThreadID] : null,
  );

  if (thread.avatar) {
    return thread.avatar;
  }

  if (thread.containingThreadID && thread.containingThreadID !== genesis.id) {
    invariant(containingThreadInfo, 'containingThreadInfo should be set');

    return containingThreadInfo.avatar
      ? containingThreadInfo.avatar
      : getDefaultAvatar(containingThreadInfo.id, containingThreadInfo.color);
  }

  return getDefaultAvatar(thread.id, thread.color);
}

export { getAvatarForUser, getUserAvatarForThread, useGetAvatarForThread };
