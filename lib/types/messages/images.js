// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { imageValidator } from '../media-types';
import type { Image } from '../media-types';
import { messageTypes } from '../message-types-enum';
import type { RelativeUserInfo } from '../user-types';

export type ImagesMessageData = {
  type: 14,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  media: $ReadOnlyArray<Image>,
};

export type RawImagesMessageInfo = {
  ...ImagesMessageData,
  id?: string, // null if local copy without ID yet
};

export const rawImagesMessageInfoValidator: TInterface = tShape({
  type: tNumber(messageTypes.IMAGES),
  localID: t.maybe(t.String),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  media: t.list(imageValidator),
  id: t.maybe(t.String),
});

export type ImagesMessageInfo = {
  type: 14,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  media: $ReadOnlyArray<Image>,
};
