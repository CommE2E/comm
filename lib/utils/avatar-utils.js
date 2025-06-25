// @flow

import t from 'tcomb';
import type { TUnion, TInterface } from 'tcomb';

import { tShape, tString, tID } from './validation-utils.js';
import {
  type ImageAvatarDBContent,
  type EncryptedImageAvatarDBContent,
  type UpdateUserAvatarRemoveRequest,
  type UpdateUserAvatarRequest,
  emojiAvatarDBContentValidator,
  ensAvatarDBContentValidator,
  farcasterAvatarDBContentValidator,
} from '../types/avatar-types.js';

const imageAvatarDBContentValidator: TInterface<ImageAvatarDBContent> = tShape({
  type: tString('image'),
  uploadID: tID,
});

const encryptedImageAvatarDBContentValidator: TInterface<EncryptedImageAvatarDBContent> =
  tShape({
    type: tString('encrypted_image'),
    uploadID: tID,
  });

const updateUserAvatarRemoveRequestValidator: TInterface<UpdateUserAvatarRemoveRequest> =
  tShape({
    type: tString('remove'),
  });

const updateUserAvatarRequestValidator: TUnion<UpdateUserAvatarRequest> =
  t.union([
    emojiAvatarDBContentValidator,
    imageAvatarDBContentValidator,
    encryptedImageAvatarDBContentValidator,
    ensAvatarDBContentValidator,
    farcasterAvatarDBContentValidator,
    updateUserAvatarRemoveRequestValidator,
  ]);

export {
  emojiAvatarDBContentValidator,
  imageAvatarDBContentValidator,
  encryptedImageAvatarDBContentValidator,
  ensAvatarDBContentValidator,
  updateUserAvatarRemoveRequestValidator,
  updateUserAvatarRequestValidator,
};
