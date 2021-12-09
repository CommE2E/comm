// @flow

import { messageID } from '../shared/message-utils';
import { messageSpecs } from '../shared/messages/message-specs';
import type { Media, ClientDBMediaInfo, Image } from '../types/media-types';
import {
  type ClientDBMessageInfo,
  type RawMessageInfo,
  messageTypes,
  assertMessageType,
  type MessageStoreOperation,
  type ClientDBMessageStoreOperation,
} from '../types/message-types';

function translateMediaToClientDBMediaInfo(media: Media): ClientDBMediaInfo {
  return {
    id: media.id,
    uri: media.uri,
    type: media.type,
    extras: JSON.stringify({
      dimensions: media.dimensions,
      loop: media.type === 'video' ? media.loop : false,
      local_media_selection: media.localMediaSelection,
    }),
  };
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
    content: messageSpecs[rawMessageInfo.type].messageContentForClientDB?.(
      rawMessageInfo,
    ),
    media_infos:
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
        ? rawMessageInfo.media.map(translateMediaToClientDBMediaInfo)
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
  translateMediaToClientDBMediaInfo,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBMessageInfosToRawMessageInfos,
  convertMessageStoreOperationsToClientDBOperations,
};
