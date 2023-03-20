// @flow

import t, { TInterface, TUnion } from 'tcomb';

import { tRegex, tShape, tString } from './validation-utils.js';
import { validHexColorRegex } from '../shared/account-utils.js';
import { onlyOneEmojiRegex } from '../shared/emojis.js';

const emojiAvatarDBContentValidator: TInterface = tShape({
  type: tString('emoji'),
  emoji: tRegex(onlyOneEmojiRegex),
  color: tRegex(validHexColorRegex),
});

const imageAvatarDBContentValidator: TInterface = tShape({
  type: tString('image'),
  uploadID: t.String,
});

const ensAvatarDBContentValidator: TInterface = tShape({
  type: tString('ens'),
});

const updateUserAvatarRemoveRequestValidator: TInterface = tShape({
  type: tString('remove'),
});

const updateUserAvatarRequestValidator: TUnion<TInterface> = t.union([
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
