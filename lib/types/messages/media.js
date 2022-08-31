// @flow

import type { Media } from '../media-types';
import type { RelativeUserInfo } from '../user-types';

export type MediaMessageData = {
  type: 15,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  media: $ReadOnlyArray<Media>,
};

export type RawMediaMessageInfo = {
  ...MediaMessageData,
  id?: string, // null if local copy without ID yet
};

export type MediaMessageInfo = {
  type: 15,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  media: $ReadOnlyArray<Media>,
};

export type MediaMessageServerDBContent =
  | {
      +type: 'photo',
      +uploadID: string,
    }
  | {
      +type: 'video',
      +uploadID: string,
      +thumbnailUploadID: string,
    };
