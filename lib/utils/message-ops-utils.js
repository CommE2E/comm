// @flow

import invariant from 'invariant';
import _keyBy from 'lodash/fp/keyBy.js';

import { messageID } from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type {
  Media,
  ClientDBMediaInfo,
  Image,
  Video,
} from '../types/media-types.js';
import {
  type ClientDBMessageInfo,
  type RawMessageInfo,
  messageTypes,
  assertMessageType,
  type MessageStoreOperation,
  type ClientDBMessageStoreOperation,
} from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';

function translateMediaToClientDBMediaInfos(
  media: $ReadOnlyArray<Media>,
): $ReadOnlyArray<ClientDBMediaInfo> {
  const clientDBMediaInfos = [];
  for (const m of media) {
    invariant(
      m.type === 'photo' || m.type === 'video',
      'unimplemented media type',
    );
    clientDBMediaInfos.push({
      id: m.id,
      uri: m.uri,
      type: m.type,
      extras: JSON.stringify({
        dimensions: m.dimensions,
        loop: m.type === 'video' ? m.loop : false,
        local_media_selection: m.localMediaSelection,
      }),
    });
    if (m.type === 'video') {
      clientDBMediaInfos.push({
        id: m.thumbnailID,
        uri: m.thumbnailURI,
        type: 'photo',
        extras: JSON.stringify({
          dimensions: m.dimensions,
          loop: false,
        }),
      });
    }
  }
  return clientDBMediaInfos;
}

function translateClientDBMediaInfoToImage(
  clientDBMediaInfo: ClientDBMediaInfo,
): Image {
  const { dimensions, local_media_selection } = JSON.parse(
    clientDBMediaInfo.extras,
  );

  if (!local_media_selection) {
    return {
      id: clientDBMediaInfo.id,
      uri: clientDBMediaInfo.uri,
      type: 'photo',
      dimensions: dimensions,
    };
  }
  return {
    id: clientDBMediaInfo.id,
    uri: clientDBMediaInfo.uri,
    type: 'photo',
    dimensions: dimensions,
    localMediaSelection: local_media_selection,
  };
}

function translateClientDBMediaInfosToMedia(
  clientDBMessageInfo: ClientDBMessageInfo,
): $ReadOnlyArray<Media> {
  if (parseInt(clientDBMessageInfo.type) === messageTypes.IMAGES) {
    if (!clientDBMessageInfo.media_infos) {
      return [];
    }
    return clientDBMessageInfo.media_infos.map(
      translateClientDBMediaInfoToImage,
    );
  }
  if (!clientDBMessageInfo.media_infos) {
    return [];
  }
  const mediaInfos: $ReadOnlyArray<ClientDBMediaInfo> =
    clientDBMessageInfo.media_infos;
  const mediaMap = _keyBy('id')(mediaInfos);

  if (!clientDBMessageInfo.content) {
    return [];
  }
  const messageContent: $ReadOnlyArray<MediaMessageServerDBContent> =
    JSON.parse(clientDBMessageInfo.content);

  const translatedMedia = [];
  for (const media of messageContent) {
    if (media.type === 'photo') {
      const extras = JSON.parse(mediaMap[media.uploadID].extras);
      const { dimensions } = extras;

      const image: Image = {
        id: media.uploadID,
        uri: mediaMap[media.uploadID].uri,
        type: 'photo',
        dimensions,
      };
      translatedMedia.push(image);
    } else if (media.type === 'video') {
      const extras = JSON.parse(mediaMap[media.uploadID].extras);
      const {
        dimensions,
        loop,
        local_media_selection: localMediaSelection,
      } = extras;

      const video: Video = {
        id: media.uploadID,
        uri: mediaMap[media.uploadID].uri,
        type: 'video',
        dimensions,
        loop,
        thumbnailID: media.thumbnailUploadID,
        thumbnailURI: mediaMap[media.thumbnailUploadID].uri,
      };
      translatedMedia.push(
        localMediaSelection ? { ...video, localMediaSelection } : video,
      );
    }
  }
  return translatedMedia;
}

function translateRawMessageInfoToClientDBMessageInfo(
  rawMessageInfo: RawMessageInfo,
): ClientDBMessageInfo {
  return {
    id: messageID(rawMessageInfo),
    local_id: rawMessageInfo.localID ? rawMessageInfo.localID : null,
    thread: rawMessageInfo.threadID,
    user: rawMessageInfo.creatorID,
    type: rawMessageInfo.type.toString(),
    future_type:
      rawMessageInfo.type === messageTypes.UNSUPPORTED
        ? rawMessageInfo.unsupportedMessageInfo.type.toString()
        : null,
    time: rawMessageInfo.time.toString(),
    content:
      messageSpecs[rawMessageInfo.type].messageContentForClientDB?.(
        rawMessageInfo,
      ),
    media_infos:
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
        ? translateMediaToClientDBMediaInfos(rawMessageInfo.media)
        : null,
  };
}

function translateClientDBMessageInfoToRawMessageInfo(
  clientDBMessageInfo: ClientDBMessageInfo,
): RawMessageInfo {
  return messageSpecs[
    assertMessageType(parseInt(clientDBMessageInfo.type))
  ].rawMessageInfoFromClientDB(clientDBMessageInfo);
}

function translateClientDBMessageInfosToRawMessageInfos(
  clientDBMessageInfos: $ReadOnlyArray<ClientDBMessageInfo>,
): { +[id: string]: RawMessageInfo } {
  return Object.fromEntries(
    clientDBMessageInfos.map((dbMessageInfo: ClientDBMessageInfo) => [
      dbMessageInfo.id,
      translateClientDBMessageInfoToRawMessageInfo(dbMessageInfo),
    ]),
  );
}

function convertMessageStoreOperationsToClientDBOperations(
  messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
): $ReadOnlyArray<ClientDBMessageStoreOperation> {
  return messageStoreOperations.map(messageStoreOperation => {
    if (messageStoreOperation.type !== 'replace') {
      return messageStoreOperation;
    }
    return {
      type: 'replace',
      payload: translateRawMessageInfoToClientDBMessageInfo(
        messageStoreOperation.payload.messageInfo,
      ),
    };
  });
}

export {
  translateClientDBMediaInfoToImage,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBMessageInfosToRawMessageInfos,
  convertMessageStoreOperationsToClientDBOperations,
  translateClientDBMediaInfosToMedia,
};
