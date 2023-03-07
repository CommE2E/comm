// @flow

import stringHash from 'string-hash';

import { selectedThreadColors } from './thread-utils.js';
import type { EmojiAvatar } from '../types/avatar-types.js';

const defaultEmojiAvatars: $ReadOnlyArray<EmojiAvatar> = [
  { color: selectedThreadColors[7], emoji: '😀' },
  { color: selectedThreadColors[0], emoji: '😆' },
  { color: selectedThreadColors[1], emoji: '🤩' },
  { color: selectedThreadColors[7], emoji: '🏈' },
  { color: selectedThreadColors[2], emoji: '👻' },
  { color: selectedThreadColors[3], emoji: '🧑‍🚀' },
  { color: selectedThreadColors[4], emoji: '🎩' },
  { color: selectedThreadColors[5], emoji: '🍦' },
  { color: selectedThreadColors[6], emoji: '🚀' },
  { color: selectedThreadColors[8], emoji: '🥰' },
  { color: selectedThreadColors[3], emoji: '🐬' },
  { color: selectedThreadColors[4], emoji: '🍀' },
  { color: selectedThreadColors[9], emoji: '🍕' },
  { color: selectedThreadColors[0], emoji: '🙄' },
  { color: selectedThreadColors[1], emoji: '🥳' },
  { color: selectedThreadColors[7], emoji: '🥸' },
  { color: selectedThreadColors[2], emoji: '🦋' },
  { color: selectedThreadColors[9], emoji: '🏆' },
  { color: selectedThreadColors[5], emoji: '🎲' },
  { color: selectedThreadColors[8], emoji: '🏀' },
];

function getAvatarForUser(
  user: ?{ +avatar?: ?EmojiAvatar, +username?: ?string, ... },
): EmojiAvatar {
  if (user?.avatar) {
    return user.avatar;
  }

  if (!user?.username) {
    return defaultEmojiAvatars[0];
  }

  const avatarIndex = stringHash(user.username) % defaultEmojiAvatars.length;
  return defaultEmojiAvatars[avatarIndex];
}

export { getAvatarForUser };
