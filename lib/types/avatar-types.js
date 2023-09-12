// @flow

import t, { type TUnion, type TInterface } from 'tcomb';

import type { CreateUpdatesResult } from './update-types.js';
import { validHexColorRegex } from '../shared/account-utils.js';
import { onlyOneEmojiRegex } from '../shared/emojis.js';
import { tRegex, tShape, tString } from '../utils/validation-utils.js';

export type EmojiAvatarDBContent = {
  +type: 'emoji',
  +emoji: string,
  +color: string, // hex, without "#" or "0x"
};
export const emojiAvatarDBContentValidator: TInterface<EmojiAvatarDBContent> =
  tShape<EmojiAvatarDBContent>({
    type: tString('emoji'),
    emoji: tRegex(onlyOneEmojiRegex),
    color: tRegex(validHexColorRegex),
  });

export type ImageAvatarDBContent = {
  +type: 'image',
  +uploadID: string,
};

export type EncryptedImageAvatarDBContent = {
  +type: 'encrypted-image',
  +uploadID: string,
};

export type ENSAvatarDBContent = {
  +type: 'ens',
};
export const ensAvatarDBContentValidator: TInterface<ENSAvatarDBContent> =
  tShape({ type: tString('ens') });

export type AvatarDBContent =
  | EmojiAvatarDBContent
  | ImageAvatarDBContent
  | EncryptedImageAvatarDBContent
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

export type ClientEncryptedImageAvatar = {
  +type: 'encrypted-image',
  +blobURI: string,
  +encryptionKey: string,
};
const clientEncryptedImageAvatarValidator = tShape<ClientEncryptedImageAvatar>({
  type: tString('encrypted-image'),
  blobURI: t.String,
  encryptionKey: t.String,
});

export type ClientENSAvatar = ENSAvatarDBContent;
const clientENSAvatarValidator = ensAvatarDBContentValidator;

export type ClientAvatar =
  | ClientEmojiAvatar
  | ClientImageAvatar
  | ClientEncryptedImageAvatar
  | ClientENSAvatar;
export const clientAvatarValidator: TUnion<ClientAvatar> = t.union([
  clientEmojiAvatarValidator,
  clientImageAvatarValidator,
  clientENSAvatarValidator,
  clientEncryptedImageAvatarValidator,
]);

export type ResolvedClientAvatar =
  | ClientEmojiAvatar
  | ClientImageAvatar
  | ClientEncryptedImageAvatar;

export type UpdateUserAvatarResponse = {
  +updates: CreateUpdatesResult,
};

export type GenericUserInfoWithAvatar = {
  +username?: ?string,
  +avatar?: ?ClientAvatar,
  ...
};
