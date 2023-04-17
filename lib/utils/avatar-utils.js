// @flow

import t from 'tcomb';
import type { TUnion, TInterface } from 'tcomb';

import { tRegex, tShape, tString } from './validation-utils.js';
import { validHexColorRegex } from '../shared/account-utils.js';
import { onlyOneEmojiRegex } from '../shared/emojis.js';
import type {
  ENSAvatarDBContent,
  EmojiAvatarDBContent,
  ImageAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
  UpdateUserAvatarRequest,
} from '../types/avatar-types';

const emojiAvatarDBContentValidator: TInterface<EmojiAvatarDBContent> = tShape({
  type: tString('emoji'),
  emoji: tRegex(onlyOneEmojiRegex),
  color: tRegex(validHexColorRegex),
});

const imageAvatarDBContentValidator: TInterface<ImageAvatarDBContent> = tShape({
  type: tString('image'),
  uploadID: t.String,
});

const ensAvatarDBContentValidator: TInterface<ENSAvatarDBContent> = tShape({
  type: tString('ens'),
});

const updateUserAvatarRemoveRequestValidator: TInterface<UpdateUserAvatarRemoveRequest> =
  tShape({
    type: tString('remove'),
  });

const updateUserAvatarRequestValidator: TUnion<UpdateUserAvatarRequest> =
  t.union([
    emojiAvatarDBContentValidator,
    imageAvatarDBContentValidator,
    ensAvatarDBContentValidator,
    updateUserAvatarRemoveRequestValidator,
  ]);

export {
  emojiAvatarDBContentValidator,
  imageAvatarDBContentValidator,
  ensAvatarDBContentValidator,
  updateUserAvatarRemoveRequestValidator,
  updateUserAvatarRequestValidator,
};
