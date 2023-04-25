// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type MessageSpec,
  type MessageTitleParam,
  type RawMessageInfoFromServerDBRowParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import {
  isMediaBlobServiceHosted,
  contentStringForMediaArray,
  multimediaMessagePreview,
} from '../../media/media-utils.js';
import type { PlatformDetails } from '../../types/device-types.js';
import {
  messageTypes,
  assertMessageType,
  isMediaMessageType,
} from '../../types/message-types.js';
import type {
  MessageInfo,
  RawMessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  ImagesMessageData,
  RawImagesMessageInfo,
  ImagesMessageInfo,
} from '../../types/messages/images.js';
import type {
  MediaMessageData,
  MediaMessageInfo,
  RawMediaMessageInfo,
} from '../../types/messages/media.js';
import { getMediaMessageServerDBContentsFromMedia } from '../../types/messages/media.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';
import {
  translateClientDBMediaInfosToMedia,
  translateClientDBMediaInfoToImage,
} from '../../utils/message-ops-utils.js';
import { createMediaMessageInfo } from '../message-utils.js';
import { threadIsGroupChat } from '../thread-utils.js';
import { hasMinCodeVersion } from '../version-utils.js';

export const multimediaMessageSpec: MessageSpec<
  MediaMessageData | ImagesMessageData,
  RawMediaMessageInfo | RawImagesMessageInfo,
  MediaMessageInfo | ImagesMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data:
      | MediaMessageData
      | ImagesMessageData
      | RawMediaMessageInfo
      | RawImagesMessageInfo,
  ): string {
    if (data.type === messageTypes.MULTIMEDIA) {
      return JSON.stringify(
        getMediaMessageServerDBContentsFromMedia(data.media),
      );
    }
    const mediaIDs = data.media.map(media => parseInt(media.id, 10));
    return JSON.stringify(mediaIDs);
  },

  messageContentForClientDB(
    data: RawMediaMessageInfo | RawImagesMessageInfo,
  ): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawImagesMessageInfo | RawMediaMessageInfo {
    const messageType = assertMessageType(parseInt(clientDBMessageInfo.type));
    invariant(
      isMediaMessageType(messageType),
      'message must be of type IMAGES or MULTIMEDIA',
    );
    invariant(
      clientDBMessageInfo.media_infos !== null &&
        clientDBMessageInfo.media_infos !== undefined,
      `media_infos must be defined`,
    );

    let rawMessageInfo: RawImagesMessageInfo | RawMediaMessageInfo =
      messageType === messageTypes.IMAGES
        ? {
            type: messageTypes.IMAGES,
            threadID: clientDBMessageInfo.thread,
            creatorID: clientDBMessageInfo.user,
            time: parseInt(clientDBMessageInfo.time),
            media:
              clientDBMessageInfo.media_infos?.map(
                translateClientDBMediaInfoToImage,
              ) ?? [],
          }
        : {
            type: messageTypes.MULTIMEDIA,
            threadID: clientDBMessageInfo.thread,
            creatorID: clientDBMessageInfo.user,
            time: parseInt(clientDBMessageInfo.time),
            media: translateClientDBMediaInfosToMedia(clientDBMessageInfo),
          };

    if (clientDBMessageInfo.local_id) {
      rawMessageInfo = {
        ...rawMessageInfo,
        localID: clientDBMessageInfo.local_id,
      };
    }
    if (clientDBMessageInfo.id !== clientDBMessageInfo.local_id) {
      rawMessageInfo = {
        ...rawMessageInfo,
        id: clientDBMessageInfo.id,
      };
    }
    return rawMessageInfo;
  },

  messageTitle({
    messageInfo,
  }: MessageTitleParam<MediaMessageInfo | ImagesMessageInfo>) {
    const creator = ET.user({ userInfo: messageInfo.creator });
    const preview = multimediaMessagePreview(messageInfo);
    return ET`${creator} ${preview}`;
  },

  rawMessageInfoFromServerDBRow(
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ): RawMediaMessageInfo | RawImagesMessageInfo {
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

  createMessageInfo(
    rawMessageInfo: RawMediaMessageInfo | RawImagesMessageInfo,
    creator: RelativeUserInfo,
  ): ?(MediaMessageInfo | ImagesMessageInfo) {
    if (rawMessageInfo.type === messageTypes.IMAGES) {
      let messageInfo: ImagesMessageInfo = {
        type: messageTypes.IMAGES,
        threadID: rawMessageInfo.threadID,
        creator,
        time: rawMessageInfo.time,
        media: rawMessageInfo.media,
      };
      if (rawMessageInfo.id) {
        messageInfo = { ...messageInfo, id: rawMessageInfo.id };
      }
      if (rawMessageInfo.localID) {
        messageInfo = { ...messageInfo, localID: rawMessageInfo.localID };
      }
      return messageInfo;
    } else if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      let messageInfo: MediaMessageInfo = {
        type: messageTypes.MULTIMEDIA,
        threadID: rawMessageInfo.threadID,
        creator,
        time: rawMessageInfo.time,
        media: rawMessageInfo.media,
      };
      if (rawMessageInfo.id) {
        messageInfo = { ...messageInfo, id: rawMessageInfo.id };
      }
      if (rawMessageInfo.localID) {
        messageInfo = { ...messageInfo, localID: rawMessageInfo.localID };
      }
      return messageInfo;
    }
  },

  rawMessageInfoFromMessageData(
    messageData: MediaMessageData | ImagesMessageData,
    id: ?string,
  ): RawMediaMessageInfo | RawImagesMessageInfo {
    const { sidebarCreation, ...rest } = messageData;
    if (rest.type === messageTypes.IMAGES && id) {
      return ({ ...rest, id }: RawImagesMessageInfo);
    } else if (rest.type === messageTypes.IMAGES) {
      return ({ ...rest }: RawImagesMessageInfo);
    } else if (id) {
      return ({ ...rest, id }: RawMediaMessageInfo);
    } else {
      return ({ ...rest }: RawMediaMessageInfo);
    }
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawMediaMessageInfo | RawImagesMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawMediaMessageInfo | RawImagesMessageInfo | RawUnsupportedMessageInfo {
    if (rawMessageInfo.type === messageTypes.IMAGES) {
      return rawMessageInfo;
    }

    const containsBlobServiceMedia = rawMessageInfo.media.some(
      isMediaBlobServiceHosted,
    );
    const containsEncryptedMedia = rawMessageInfo.media.some(
      media =>
        media.type === 'encrypted_photo' || media.type === 'encrypted_video',
    );
    if (
      !containsBlobServiceMedia &&
      !containsEncryptedMedia &&
      hasMinCodeVersion(platformDetails, 158)
    ) {
      return rawMessageInfo;
    }
    if (!containsBlobServiceMedia && hasMinCodeVersion(platformDetails, 205)) {
      return rawMessageInfo;
    }
    if (hasMinCodeVersion(platformDetails, 209)) {
      return rawMessageInfo;
    }

    const { id } = rawMessageInfo;
    invariant(id !== null && id !== undefined, 'id should be set on server');
    return {
      type: messageTypes.UNSUPPORTED,
      id,
      threadID: rawMessageInfo.threadID,
      creatorID: rawMessageInfo.creatorID,
      time: rawMessageInfo.time,
      robotext: multimediaMessagePreview(rawMessageInfo),
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(
    unwrapped: RawMediaMessageInfo | RawImagesMessageInfo,
    messageInfo: RawMessageInfo,
  ): ?RawMessageInfo {
    if (unwrapped.type === messageTypes.IMAGES) {
      return {
        ...unwrapped,
        media: unwrapped.media.map(media => {
          if (media.dimensions) {
            return media;
          }
          const dimensions = preDimensionUploads[media.id];
          invariant(
            dimensions,
            'only four photos were uploaded before dimensions were calculated, ' +
              `and ${media.id} was not one of them`,
          );
          return { ...media, dimensions };
        }),
      };
    } else if (unwrapped.type === messageTypes.MULTIMEDIA) {
      for (const media of unwrapped.media) {
        if (isMediaBlobServiceHosted(media)) {
          return messageInfo;
        }
        const { type } = media;
        if (
          type !== 'photo' &&
          type !== 'video' &&
          type !== 'encrypted_photo' &&
          type !== 'encrypted_video'
        ) {
          return messageInfo;
        }
      }
    }
    return undefined;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const media = [];
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.IMAGES ||
          messageInfo.type === messageTypes.MULTIMEDIA,
        'messageInfo should be multimedia type!',
      );
      for (const singleMedia of messageInfo.media) {
        media.push(singleMedia);
      }
    }
    const contentString = contentStringForMediaArray(media);
    const creator = ET.user({ userInfo: messageInfos[0].creator });

    let body, merged;
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      body = `sent you ${contentString}`;
      merged = body;
    } else {
      body = `sent ${contentString}`;
      const thread = ET.thread({ display: 'shortName', threadInfo });
      merged = ET`${body} to ${thread}`;
    }
    merged = ET`${creator} ${merged}`;

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: ET`${creator}`,
    };
  },

  notificationCollapseKey(
    rawMessageInfo: RawMediaMessageInfo | RawImagesMessageInfo,
  ): string {
    // We use the legacy constant here to collapse both types into one
    return joinResult(
      messageTypes.IMAGES,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: async (
    rawMessageInfo: RawMediaMessageInfo | RawImagesMessageInfo,
    messageData: MediaMessageData | ImagesMessageData,
  ) => (messageData.sidebarCreation ? undefined : pushTypes.NOTIF),

  includedInRepliesCount: true,
});

// Four photos were uploaded before dimensions were calculated server-side,
// and delivered to clients without dimensions in the MultimediaMessageInfo.
const preDimensionUploads = {
  '156642': { width: 1440, height: 1080 },
  '156649': { width: 720, height: 803 },
  '156794': { width: 720, height: 803 },
  '156877': { width: 574, height: 454 },
};
