// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  ImagesMessageData,
  RawImagesMessageInfo,
  ImagesMessageInfo,
} from '../../types/message/images';
import type {
  MediaMessageData,
  MediaMessageInfo,
  RawMediaMessageInfo,
} from '../../types/message/media';
import { createMediaMessageInfo } from '../message-utils';
import type { MessageSpec } from './message-spec';

export const multimediaMessageSpec: MessageSpec<
  MediaMessageData | ImagesMessageData,
  RawMediaMessageInfo | RawImagesMessageInfo,
  MediaMessageInfo | ImagesMessageInfo,
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

  createMessageInfo(rawMessageInfo, creator) {
    if (rawMessageInfo.type === messageTypes.IMAGES) {
      const messageInfo: ImagesMessageInfo = {
        type: messageTypes.IMAGES,
        threadID: rawMessageInfo.threadID,
        creator,
        time: rawMessageInfo.time,
        media: rawMessageInfo.media,
      };
      if (rawMessageInfo.id) {
        messageInfo.id = rawMessageInfo.id;
      }
      if (rawMessageInfo.localID) {
        messageInfo.localID = rawMessageInfo.localID;
      }
      return messageInfo;
    } else if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      const messageInfo: MediaMessageInfo = {
        type: messageTypes.MULTIMEDIA,
        threadID: rawMessageInfo.threadID,
        creator,
        time: rawMessageInfo.time,
        media: rawMessageInfo.media,
      };
      if (rawMessageInfo.id) {
        messageInfo.id = rawMessageInfo.id;
      }
      if (rawMessageInfo.localID) {
        messageInfo.localID = rawMessageInfo.localID;
      }
      return messageInfo;
    }
  },

  rawMessageInfoFromMessageData(messageData, id) {
    if (messageData.type === messageTypes.IMAGES) {
      return ({ ...messageData, id }: RawImagesMessageInfo);
    } else {
      return ({ ...messageData, id }: RawMediaMessageInfo);
    }
  },
});
