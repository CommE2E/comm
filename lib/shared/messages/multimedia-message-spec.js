// @flow

import invariant from 'invariant';

import type {
  ImagesMessageData,
  RawImagesMessageInfo,
} from '../../types/message/images';
import type {
  MediaMessageData,
  RawMediaMessageInfo,
} from '../../types/message/media';
import { createMediaMessageInfo } from '../message-utils';
import type { MessageSpec } from './message-spec';

export const multimediaMessageSpec: MessageSpec<
  MediaMessageData | ImagesMessageData,
  RawMediaMessageInfo | RawImagesMessageInfo,
> = Object.freeze({
  messageContent(data) {
    const mediaIDs = data.media.map((media) => parseInt(media.id, 10));
    return JSON.stringify(mediaIDs);
  },

  rawMessageInfoFromRow(row, params) {
    const { localID, media } = params;
    invariant(media, 'Media should be provided');
    return createMediaMessageInfo({
      threadID: row.threadID.toString(),
      creatorID: row.creatorID.toString(),
      media,
      id: row.id.toString(),
      localID,
      time: row.time,
    });
  },
});
