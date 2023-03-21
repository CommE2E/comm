// @flow

import stringHash from 'string-hash';

import { selectedThreadColors } from './thread-utils.js';
import type { ClientEmojiAvatar, ClientAvatar } from '../types/avatar-types.js';

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

function getAvatarForUser(
  user: ?{ +avatar?: ?ClientAvatar, +username?: ?string, ... },
): ClientAvatar {
  if (user?.avatar) {
    return user.avatar;
  }

  if (!user?.username) {
    return defaultAnonymousUserEmojiAvatar;
  }

  const avatarIndex = stringHash(user.username) % defaultEmojiAvatars.length;
  return defaultEmojiAvatars[avatarIndex];
}

export { getAvatarForUser };
