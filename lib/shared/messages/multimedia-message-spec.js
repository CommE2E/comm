// @flow

import invariant from 'invariant';

import {
  contentStringForMediaArray,
  multimediaMessagePreview,
  shimUploadURI,
} from '../../media/media-utils';
import type { PlatformDetails } from '../../types/device-types';
import type { Media, Video, Image } from '../../types/media-types';
import {
  messageTypes,
  assertMessageType,
  isMediaMessageType,
} from '../../types/message-types';
import type {
  MessageInfo,
  RawMessageInfo,
  RawMultimediaMessageInfo,
  MultimediaMessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  ImagesMessageData,
  RawImagesMessageInfo,
  ImagesMessageInfo,
} from '../../types/messages/images';
import type {
  MediaMessageData,
  MediaMessageInfo,
  RawMediaMessageInfo,
} from '../../types/messages/media';
import { getMediaMessageServerDBContentsFromMedia } from '../../types/messages/media';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  translateClientDBMediaInfosToMedia,
  translateClientDBMediaInfoToImage,
} from '../../utils/message-ops-utils';
import {
  createMediaMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { threadIsGroupChat } from '../thread-utils';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import {
  pushTypes,
  type MessageSpec,
  type MessageTitleParam,
  type NotificationTextsParams,
  type RawMessageInfoFromServerDBRowParams,
} from './message-spec';
import { joinResult } from './utils';

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

    const rawMessageInfo: RawImagesMessageInfo | RawMediaMessageInfo =
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
      rawMessageInfo.localID = clientDBMessageInfo.local_id;
    }
    if (clientDBMessageInfo.id !== clientDBMessageInfo.local_id) {
      rawMessageInfo.id = clientDBMessageInfo.id;
    }
    return rawMessageInfo;
  },

  messageTitle({
    messageInfo,
    viewerContext,
  }: MessageTitleParam<MediaMessageInfo | ImagesMessageInfo>) {
    let validMessageInfo: MultimediaMessageInfo = (messageInfo: MultimediaMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    const creator = stringForUser(validMessageInfo.creator);
    const preview = multimediaMessagePreview(validMessageInfo);
    return `${creator} ${preview}`;
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

  rawMessageInfoFromMessageData(
    messageData: MediaMessageData | ImagesMessageData,
    id: ?string,
  ): RawMediaMessageInfo | RawImagesMessageInfo {
    if (messageData.type === messageTypes.IMAGES && id) {
      return ({ ...messageData, id }: RawImagesMessageInfo);
    } else if (messageData.type === messageTypes.IMAGES) {
      return ({ ...messageData }: RawImagesMessageInfo);
    } else if (id) {
      return ({ ...messageData, id }: RawMediaMessageInfo);
    } else {
      return ({ ...messageData }: RawMediaMessageInfo);
    }
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawMediaMessageInfo | RawImagesMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawMediaMessageInfo | RawImagesMessageInfo | RawUnsupportedMessageInfo {
    if (rawMessageInfo.type === messageTypes.IMAGES) {
      const shimmedRawMessageInfo = shimMediaMessageInfo(
        rawMessageInfo,
        platformDetails,
      );
      return shimmedRawMessageInfo;
    } else {
      const shimmedRawMessageInfo = shimMediaMessageInfo(
        rawMessageInfo,
        platformDetails,
      );
      // TODO figure out first native codeVersion supporting video playback
      if (hasMinCodeVersion(platformDetails, 158)) {
        return shimmedRawMessageInfo;
      }
      const { id } = shimmedRawMessageInfo;
      invariant(id !== null && id !== undefined, 'id should be set on server');
      return {
        type: messageTypes.UNSUPPORTED,
        id,
        threadID: shimmedRawMessageInfo.threadID,
        creatorID: shimmedRawMessageInfo.creatorID,
        time: shimmedRawMessageInfo.time,
        robotext: multimediaMessagePreview(shimmedRawMessageInfo),
        unsupportedMessageInfo: shimmedRawMessageInfo,
      };
    }
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
      for (const { type } of unwrapped.media) {
        if (type !== 'photo' && type !== 'video') {
          return messageInfo;
        }
      }
    }
    return undefined;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
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
    const userString = stringForUser(messageInfos[0].creator);

    let body, merged;
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      body = `sent you ${contentString}`;
      merged = body;
    } else {
      body = `sent ${contentString}`;
      const threadName = params.notifThreadName(threadInfo);
      merged = `${body} to ${threadName}`;
    }
    merged = `${userString} ${merged}`;

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: userString,
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

  generatesNotifs: async () => pushTypes.NOTIF,

  includedInRepliesCount: true,
});

function shimMediaMessageInfo(
  rawMessageInfo: RawMultimediaMessageInfo,
  platformDetails: ?PlatformDetails,
): RawMultimediaMessageInfo {
  if (rawMessageInfo.type === messageTypes.IMAGES) {
    let uriChanged = false;
    const newMedia: Image[] = [];
    for (const singleMedia of rawMessageInfo.media) {
      const shimmedURI = shimUploadURI(singleMedia.uri, platformDetails);
      if (shimmedURI === singleMedia.uri) {
        newMedia.push(singleMedia);
      } else {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Image));
        uriChanged = true;
      }
    }
    if (!uriChanged) {
      return rawMessageInfo;
    }
    return ({
      ...rawMessageInfo,
      media: newMedia,
    }: RawImagesMessageInfo);
  } else {
    let uriChanged = false;
    const newMedia: Media[] = [];
    for (const singleMedia of rawMessageInfo.media) {
      const shimmedURI = shimUploadURI(singleMedia.uri, platformDetails);
      if (shimmedURI === singleMedia.uri) {
        newMedia.push(singleMedia);
      } else if (singleMedia.type === 'photo') {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Image));
        uriChanged = true;
      } else {
        newMedia.push(({ ...singleMedia, uri: shimmedURI }: Video));
        uriChanged = true;
      }
    }
    if (!uriChanged) {
      return rawMessageInfo;
    }
    return ({
      ...rawMessageInfo,
      media: newMedia,
    }: RawMediaMessageInfo);
  }
}

// Four photos were uploaded before dimensions were calculated server-side,
// and delivered to clients without dimensions in the MultimediaMessageInfo.
const preDimensionUploads = {
  '156642': { width: 1440, height: 1080 },
  '156649': { width: 720, height: 803 },
  '156794': { width: 720, height: 803 },
  '156877': { width: 574, height: 454 },
};
