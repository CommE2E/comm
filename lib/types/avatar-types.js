// @flow

export type EmojiAvatarDBContent = {
  +type: 'emoji',
  +emoji: string,
  +color: string, // hex, without "#" or "0x"
};

export type ImageAvatarDBContent = {
  +type: 'image',
  +uploadID: string,
};

export type ENSAvatarDBContent = {
  +type: 'ens',
};

export type AvatarDBContent =
  | EmojiAvatarDBContent
  | ImageAvatarDBContent
  | ENSAvatarDBContent;

export type UpdateUserAvatarRemoveRequest = { +type: 'remove' };

export type UpdateUserAvatarRequest =
  | AvatarDBContent
  | UpdateUserAvatarRemoveRequest;
