// @flow

import invariant from 'invariant';
import * as React from 'react';
import stringHash from 'string-hash';

import { getETHAddressForUserInfo } from './account-utils.js';
import { selectedThreadColors } from './color-utils.js';
import { threadOtherMembers } from './thread-utils.js';
import genesis from '../facts/genesis.js';
import { useENSAvatar } from '../hooks/ens-cache.js';
import {
  useFarcasterUserAvatarURL,
  useFarcasterChannelAvatarURL,
} from '../hooks/fc-cache.js';
import type {
  ClientAvatar,
  ClientEmojiAvatar,
  ResolvedClientAvatar,
} from '../types/avatar-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  threadTypeIsPersonal,
  threadTypeIsPrivate,
} from '../types/thread-types-enum.js';
import type { UserInfos } from '../types/user-types.js';

const defaultAnonymousUserEmojiAvatar: ClientEmojiAvatar = {
  color: selectedThreadColors[4],
  emoji: '👤',
  type: 'emoji',
};

const defaultEmojiAvatars: $ReadOnlyArray<ClientEmojiAvatar> = [
  { color: selectedThreadColors[0], emoji: '😀', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '😃', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '😄', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '😁', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '😆', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🙂', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '😉', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '😊', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '😇', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🥰', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '😍', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🤩', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🥳', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '😝', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '😎', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🧐', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🥸', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🤗', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '😤', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🤯', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🤔', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🫡', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🤫', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '😮', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '😲', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🤠', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🤑', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '👩‍🚀', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🥷', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '👻', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '👾', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🤖', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '😺', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '😸', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '😹', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '😻', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🎩', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '👑', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🐶', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🐱', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🐭', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🐹', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🐰', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🐻', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🐼', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🐻‍❄️', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🐨', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🐯', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🦁', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🐸', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🐔', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🐧', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🐦', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🐤', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🦄', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🐝', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🦋', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🐬', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🐳', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🐋', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🦈', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🦭', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🐘', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🦛', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🐐', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🐓', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🦃', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🦩', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🦔', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🐅', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🐆', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🦓', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🦒', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🦘', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🐎', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🐕', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🐩', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🦮', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🐈', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🦚', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🦜', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🦢', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🕊️', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🐇', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🦦', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🐿️', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🐉', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🌴', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🌱', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '☘️', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🍀', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🍄', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🌿', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🪴', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🍁', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '💐', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🌷', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🌹', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🌸', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🌻', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '⭐', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🌟', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🍏', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🍎', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🍐', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🍊', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🍋', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🍓', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🫐', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🍈', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🍒', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🥭', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🍍', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🥝', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🍅', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🥦', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🥕', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🥐', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🥯', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🍞', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🥖', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🥨', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🧀', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🥞', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🧇', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🥓', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🍔', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🍟', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🍕', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🥗', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🍝', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🍜', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🍲', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🍛', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🍣', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🍱', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🥟', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🍤', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🍙', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🍚', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🍥', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🍦', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🧁', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🍭', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🍩', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🍪', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '☕️', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🍵', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '⚽️', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🏀', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🏈', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '⚾️', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🥎', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🎾', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🏐', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🏉', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🎱', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🏆', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🎨', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🎤', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🎧', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🎼', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🎹', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🥁', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🎷', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🎺', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🎸', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🪕', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🎻', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🎲', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '♟️', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🎮', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🚗', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🚙', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🚌', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🏎️', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🛻', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🚚', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🚛', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🚘', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🚀', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🚁', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🛶', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '⛵️', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🚤', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '⚓', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🏰', type: 'emoji' },
  { color: selectedThreadColors[0], emoji: '🎡', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '💎', type: 'emoji' },
  { color: selectedThreadColors[2], emoji: '🔮', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '💈', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🧸', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🎊', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🎉', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🪩', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🚂', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '🚆', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🚊', type: 'emoji' },
  { color: selectedThreadColors[1], emoji: '🛰️', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '🏠', type: 'emoji' },
  { color: selectedThreadColors[3], emoji: '⛰️', type: 'emoji' },
  { color: selectedThreadColors[4], emoji: '🏔️', type: 'emoji' },
  { color: selectedThreadColors[5], emoji: '🗻', type: 'emoji' },
  { color: selectedThreadColors[6], emoji: '🏛️', type: 'emoji' },
  { color: selectedThreadColors[7], emoji: '⛩️', type: 'emoji' },
  { color: selectedThreadColors[8], emoji: '🧲', type: 'emoji' },
  { color: selectedThreadColors[9], emoji: '🎁', type: 'emoji' },
];

function getRandomDefaultEmojiAvatar(): ClientEmojiAvatar {
  const randomIndex = Math.floor(Math.random() * defaultEmojiAvatars.length);
  return defaultEmojiAvatars[randomIndex];
}

function getDefaultAvatar(hashKey: string, color?: string): ClientEmojiAvatar {
  let key = hashKey;

  const barPosition = key.indexOf('|');
  if (barPosition !== -1) {
    key = key.slice(barPosition + 1);
  }

  const avatarIndex = stringHash(key) % defaultEmojiAvatars.length;

  return {
    ...defaultEmojiAvatars[avatarIndex],
    color: color ? color : defaultEmojiAvatars[avatarIndex].color,
  };
}

function getAvatarForUser(
  usernameAndAvatar: ?{ +username?: ?string, +avatar?: ?ClientAvatar, ... },
): ClientAvatar {
  if (usernameAndAvatar?.avatar) {
    return usernameAndAvatar.avatar;
  }

  if (!usernameAndAvatar?.username) {
    return defaultAnonymousUserEmojiAvatar;
  }

  return getDefaultAvatar(usernameAndAvatar.username);
}

function getUserAvatarForThread(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ClientAvatar {
  if (threadTypeIsPrivate(threadInfo.type)) {
    invariant(viewerID, 'viewerID should be set for private threads');
    return getAvatarForUser(userInfos[viewerID]);
  }

  invariant(
    threadTypeIsPersonal(threadInfo.type),
    'threadInfo should be personal',
  );

  const memberInfos = threadOtherMembers(threadInfo.members, viewerID)
    .map(member => userInfos[member.id])
    .filter(Boolean);

  if (memberInfos.length === 0) {
    return defaultAnonymousUserEmojiAvatar;
  }

  return getAvatarForUser(memberInfos[0]);
}

function getAvatarForThread(
  thread: RawThreadInfo | ThreadInfo,
  containingThreadInfo: ?ThreadInfo,
): ClientAvatar {
  if (thread.avatar) {
    return thread.avatar;
  }

  if (containingThreadInfo && containingThreadInfo.id !== genesis().id) {
    return containingThreadInfo.avatar
      ? containingThreadInfo.avatar
      : getDefaultAvatar(containingThreadInfo.id, containingThreadInfo.color);
  }

  return getDefaultAvatar(thread.id, thread.color);
}

type UsernameAndFID = { +username?: ?string, +farcasterID: ?string, ... };
type FCChannelInfo = { +fcChannelID: ?string };

function useResolvedUserAvatar(
  userAvatarInfo: ClientAvatar,
  usernameAndFID: ?UsernameAndFID,
): ResolvedClientAvatar {
  const ethAddress = React.useMemo(
    () => getETHAddressForUserInfo(usernameAndFID),
    [usernameAndFID],
  );

  const ensAvatarURI = useENSAvatar(ethAddress);

  const fid = usernameAndFID?.farcasterID;
  const farcasterAvatarURL = useFarcasterUserAvatarURL(fid);

  const resolvedAvatar = React.useMemo(() => {
    if (userAvatarInfo.type !== 'ens' && userAvatarInfo.type !== 'farcaster') {
      return userAvatarInfo;
    }

    if (ensAvatarURI && userAvatarInfo.type === 'ens') {
      return {
        type: 'image',
        uri: ensAvatarURI,
      };
    }

    if (farcasterAvatarURL && userAvatarInfo.type === 'farcaster') {
      return {
        type: 'image',
        uri: farcasterAvatarURL,
      };
    }

    return defaultAnonymousUserEmojiAvatar;
  }, [userAvatarInfo, ensAvatarURI, farcasterAvatarURL]);

  return resolvedAvatar;
}

function useResolvedThreadAvatar(
  threadAvatarInfo: ClientAvatar,
  params: {
    +userProfileInfo: ?UsernameAndFID,
    +channelInfo: FCChannelInfo,
  },
): ResolvedClientAvatar {
  const username = params.userProfileInfo?.username;
  const farcasterID = params.userProfileInfo?.farcasterID;
  const fcChannelID = params.channelInfo.fcChannelID;

  const resolvedUserAvatar = useResolvedUserAvatar(threadAvatarInfo, {
    username,
    farcasterID,
  });
  const farcasterAvatarURL = useFarcasterChannelAvatarURL(fcChannelID);

  if (
    threadAvatarInfo.type !== 'ens' &&
    threadAvatarInfo.type !== 'farcaster'
  ) {
    return threadAvatarInfo;
  }

  // If both `userProfileInfo` and `channelInfo` are supplied, the former should
  // supersede the latter.
  if (username || farcasterID) {
    return resolvedUserAvatar;
  }

  if (farcasterAvatarURL) {
    return {
      type: 'image',
      uri: farcasterAvatarURL,
    };
  }

  return {
    type: 'emoji',
    color: selectedThreadColors[4],
    emoji: '👥',
  };
}

export {
  defaultAnonymousUserEmojiAvatar,
  defaultEmojiAvatars,
  getRandomDefaultEmojiAvatar,
  getDefaultAvatar,
  getAvatarForUser,
  getUserAvatarForThread,
  getAvatarForThread,
  useResolvedUserAvatar,
  useResolvedThreadAvatar,
};
