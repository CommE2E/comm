// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { imageValidator, type Image } from '../media-types.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

type ImagesSharedBase = {
  +type: 14,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string,
  +time: number,
  +media: $ReadOnlyArray<Image>,
};

export type ImagesMessageData = {
  ...ImagesSharedBase,
  +sidebarCreation?: boolean,
};

export type RawImagesMessageInfo = {
  ...ImagesSharedBase,
  +id?: string, // null if local copy without ID yet
};

export const rawImagesMessageInfoValidator: TInterface<RawImagesMessageInfo> =
  tShape<RawImagesMessageInfo>({
    type: tNumber(messageTypes.IMAGES),
    localID: t.maybe(t.String),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    media: t.list(imageValidator),
    id: t.maybe(tID),
  });

export type ImagesMessageInfo = {
  +type: 14,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +media: $ReadOnlyArray<Image>,
};
