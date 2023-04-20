// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tNumber, tID } from '../../utils/validation-utils.js';
import { type Media, mediaValidator } from '../media-types.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

type MediaSharedBase = {
  +type: 15,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string,
  +time: number,
  +media: $ReadOnlyArray<Media>,
};

export type MediaMessageData = {
  ...MediaSharedBase,
  +sidebarCreation?: boolean,
};

export type RawMediaMessageInfo = {
  ...MediaSharedBase,
  +id?: string, // null if local copy without ID yet
};

export const rawMediaMessageInfoValidator: TInterface<RawMediaMessageInfo> =
  tShape<RawMediaMessageInfo>({
    type: tNumber(messageTypes.MULTIMEDIA),
    localID: t.maybe(t.String),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    media: t.list(mediaValidator),
    id: t.maybe(tID),
  });

export type MediaMessageInfo = {
  +type: 15,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +media: $ReadOnlyArray<Media>,
};

export type PhotoMessageServerDBContent = {
  +type: 'photo',
  +uploadID: string,
};
export type VideoMessageServerDBContent = {
  +type: 'video',
  +uploadID: string,
  +thumbnailUploadID: string,
};
export type MediaMessageServerDBContent =
  | PhotoMessageServerDBContent
  | VideoMessageServerDBContent;

function getUploadIDsFromMediaMessageServerDBContents(
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
): $ReadOnlyArray<string> {
  const uploadIDs: string[] = [];
  for (const mediaContent of mediaMessageContents) {
    uploadIDs.push(mediaContent.uploadID);
    if (mediaContent.type === 'video') {
      uploadIDs.push(mediaContent.thumbnailUploadID);
    }
  }
  return uploadIDs;
}

function getMediaMessageServerDBContentsFromMedia(
  media: $ReadOnlyArray<Media>,
): $ReadOnlyArray<MediaMessageServerDBContent> {
  return media.map(m => {
    if (m.type === 'photo' || m.type === 'encrypted_photo') {
      return { type: 'photo', uploadID: m.id };
    } else if (m.type === 'video' || m.type === 'encrypted_video') {
      return {
        type: 'video',
        uploadID: m.id,
        thumbnailUploadID: m.thumbnailID,
      };
    }
    throw new Error(`Unexpected media type: ${m.type}`);
  });
}

export {
  getUploadIDsFromMediaMessageServerDBContents,
  getMediaMessageServerDBContentsFromMedia,
};
