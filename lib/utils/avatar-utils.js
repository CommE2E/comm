// @flow

import t from 'tcomb';
import type { TUnion, TInterface } from 'tcomb';

import { tShape, tString, tID } from './validation-utils.js';
import {
  type ImageAvatarDBContent,
  type UpdateUserAvatarRemoveRequest,
  type UpdateUserAvatarRequest,
  emojiAvatarDBContentValidator,
  ensAvatarDBContentValidator,
} from '../types/avatar-types.js';

const imageAvatarDBContentValidator: TInterface<ImageAvatarDBContent> = tShape({
  type: tString('image'),
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
