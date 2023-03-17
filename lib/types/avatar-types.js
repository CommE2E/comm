// @flow

export type EmojiAvatarDBContent = {
  +type: 'emoji',
  +emoji: string,
  +color: string, // hex, WITH "#" prefix
};

export type ImageAvatarDBContent = {
  +type: 'image',
  +uploadID: string,
};

export type AvatarDBContent = EmojiAvatarDBContent | ImageAvatarDBContent;
