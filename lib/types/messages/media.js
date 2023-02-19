// @flow

import type { Media } from '../media-types.js';
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

export type MediaMessageInfo = {
  +type: 15,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number, // millisecond timestamp
  +media: $ReadOnlyArray<Media>,
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
    if (m.type === 'photo') {
      return { type: 'photo', uploadID: m.id };
    } else {
      return {
        type: 'video',
        uploadID: m.id,
        thumbnailUploadID: m.thumbnailID,
      };
    }
  });
}

export {
  getUploadIDsFromMediaMessageServerDBContents,
  getMediaMessageServerDBContentsFromMedia,
};
