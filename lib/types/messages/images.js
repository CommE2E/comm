// @flow

import type { Image } from '../media-types.js';
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

export type ImagesMessageInfo = {
  +type: 14,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +media: $ReadOnlyArray<Image>,
};
