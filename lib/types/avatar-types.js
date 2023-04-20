// @flow

import t, { type TUnion } from 'tcomb';

import { tShape, tString } from '../utils/validation-utils.js';

export type EmojiAvatarDBContent = {
  +type: 'emoji',
  +emoji: string,
  +color: string, // hex, without "#" or "0x"
};
const emojiAvatarDBContentValidator = tShape<EmojiAvatarDBContent>({
  type: tString('emoji'),
  emoji: t.String,
  color: t.String,
});

export type ImageAvatarDBContent = {
  +type: 'image',
  +uploadID: string,
};

export type ENSAvatarDBContent = {
  +type: 'ens',
};
const ensAvatarDBContentValidator = tShape({ type: tString('ens') });

export type AvatarDBContent =
  | EmojiAvatarDBContent
  | ImageAvatarDBContent
  | ENSAvatarDBContent;

export type UpdateUserAvatarRemoveRequest = { +type: 'remove' };

export type UpdateUserAvatarRequest =
  | AvatarDBContent
  | UpdateUserAvatarRemoveRequest;

export type ClientEmojiAvatar = EmojiAvatarDBContent;
const clientEmojiAvatarValidator = emojiAvatarDBContentValidator;

export type ClientImageAvatar = {
  +type: 'image',
  +uri: string,
};
const clientImageAvatarValidator = tShape<ClientImageAvatar>({
  type: tString('image'),
  uri: t.String,
});

export type ClientENSAvatar = ENSAvatarDBContent;
const clientENSAvatarValidator = ensAvatarDBContentValidator;

export type ClientAvatar =
  | ClientEmojiAvatar
  | ClientImageAvatar
  | ClientENSAvatar;
export const clientAvatarValidator: TUnion<ClientAvatar> = t.union([
  clientEmojiAvatarValidator,
  clientImageAvatarValidator,
  clientENSAvatarValidator,
]);

export type ResolvedClientAvatar = ClientEmojiAvatar | ClientImageAvatar;
