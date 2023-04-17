// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import { contentStringForMediaArray } from '../media/media-utils.js';
import { messageID } from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type {
  EncryptedVideo,
  Media,
  ClientDBMediaInfo,
  Image,
  Video,
} from '../types/media-types';
import {
  type ClientDBMessageInfo,
  type RawMessageInfo,
  messageTypes,
  assertMessageType,
  type MessageStoreOperation,
  type ClientDBMessageStoreOperation,
  type ClientDBThreadMessageInfo,
  type ThreadMessageInfo,
  type MessageStoreThreads,
} from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';

function translateMediaToClientDBMediaInfos(
  media: $ReadOnlyArray<Media>,
): $ReadOnlyArray<ClientDBMediaInfo> {
  const clientDBMediaInfos = [];
  for (const m of media) {
    const type =
      m.type === 'encrypted_photo'
        ? 'photo'
        : m.type === 'encrypted_video'
        ? 'video'
        : m.type;

    const mediaURI =
      m.type === 'encrypted_photo' || m.type === 'encrypted_video'
        ? m.holder
        : m.uri;
    clientDBMediaInfos.push({
      id: m.id,
      uri: mediaURI,
      type: type,
      extras: JSON.stringify({
        dimensions: m.dimensions,
        loop: type === 'video' ? m.loop : false,
        local_media_selection: m.localMediaSelection,
        encryption_key: m.encryptionKey,
      }),
    });
    if (m.type === 'video' || m.type === 'encrypted_video') {
      const thumbnailURI =
        m.type === 'encrypted_video' ? m.thumbnailHolder : m.thumbnailURI;
      clientDBMediaInfos.push({
        id: m.thumbnailID,
        uri: thumbnailURI,
        type: 'photo',
        extras: JSON.stringify({
          dimensions: m.dimensions,
          loop: false,
          encryption_key: m.thumbnailEncryptionKey,
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

  const translatedMedia: Media[] = [];
  for (const media of messageContent) {
    if (media.type === 'photo') {
      const extras = JSON.parse(mediaMap[media.uploadID].extras);
      const { dimensions, encryption_key: encryptionKey } = extras;

      let image;
      if (encryptionKey) {
        image = {
          id: media.uploadID,
          type: 'encrypted_photo',
          holder: mediaMap[media.uploadID].uri,
          dimensions,
          encryptionKey,
        };
      } else {
        image = {
          id: media.uploadID,
          type: 'photo',
          uri: mediaMap[media.uploadID].uri,
          dimensions,
        };
      }
      translatedMedia.push(image);
    } else if (media.type === 'video') {
      const extras = JSON.parse(mediaMap[media.uploadID].extras);
      const {
        dimensions,
        loop,
        local_media_selection: localMediaSelection,
        encryption_key: encryptionKey,
      } = extras;

      if (encryptionKey) {
        const thumbnailEncryptionKey = JSON.parse(
          mediaMap[media.thumbnailUploadID].extras,
        ).encryption_key;
        const video: EncryptedVideo = {
          id: media.uploadID,
          type: 'encrypted_video',
          holder: mediaMap[media.uploadID].uri,
          dimensions,
          loop,
          encryptionKey,
          thumbnailID: media.thumbnailUploadID,
          thumbnailHolder: mediaMap[media.thumbnailUploadID].uri,
          thumbnailEncryptionKey,
        };
        translatedMedia.push(video);
      } else {
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

type TranslatedThreadMessageInfos = {
  [threadID: string]: {
    startReached: boolean,
    lastNavigatedTo: number,
    lastPruned: number,
  },
};
function translateClientDBThreadMessageInfos(
  clientDBThreadMessageInfo: $ReadOnlyArray<ClientDBThreadMessageInfo>,
): TranslatedThreadMessageInfos {
  return Object.fromEntries(
    clientDBThreadMessageInfo.map((threadInfo: ClientDBThreadMessageInfo) => [
      threadInfo.id,
      {
        startReached: threadInfo.start_reached === '1',
        lastNavigatedTo: parseInt(threadInfo.last_navigated_to),
        lastPruned: parseInt(threadInfo.last_pruned),
      },
    ]),
  );
}

function translateThreadMessageInfoToClientDBThreadMessageInfo(
  id: string,
  threadMessageInfo: ThreadMessageInfo,
): ClientDBThreadMessageInfo {
  const startReached = threadMessageInfo.startReached ? 1 : 0;
  const lastNavigatedTo = threadMessageInfo.lastNavigatedTo ?? 0;
  const lastPruned = threadMessageInfo.lastPruned ?? 0;
  return {
    id,
    start_reached: startReached.toString(),
    last_navigated_to: lastNavigatedTo.toString(),
    last_pruned: lastPruned.toString(),
  };
}

function convertMessageStoreOperationsToClientDBOperations(
  messageStoreOperations: $ReadOnlyArray<MessageStoreOperation>,
): $ReadOnlyArray<ClientDBMessageStoreOperation> {
  const convertedOperations = messageStoreOperations.map(
    messageStoreOperation => {
      if (messageStoreOperation.type === 'replace') {
        return {
          type: 'replace',
          payload: translateRawMessageInfoToClientDBMessageInfo(
            messageStoreOperation.payload.messageInfo,
          ),
        };
      }

      if (messageStoreOperation.type !== 'replace_threads') {
        return messageStoreOperation;
      }

      const threadMessageInfo: MessageStoreThreads =
        messageStoreOperation.payload.threads;
      const dbThreadMessageInfos: ClientDBThreadMessageInfo[] = [];
      for (const threadID in threadMessageInfo) {
        dbThreadMessageInfos.push(
          translateThreadMessageInfoToClientDBThreadMessageInfo(
            threadID,
            threadMessageInfo[threadID],
          ),
        );
      }
      if (dbThreadMessageInfos.length === 0) {
        return undefined;
      }
      return {
        type: 'replace_threads',
        payload: {
          threads: dbThreadMessageInfos,
        },
      };
    },
  );
  return convertedOperations.filter(Boolean);
}

function getPinnedContentFromClientDBMessageInfo(
  clientDBMessageInfo: ClientDBMessageInfo,
): string {
  const { media_infos } = clientDBMessageInfo;

  let pinnedContent;
  if (!media_infos) {
    pinnedContent = 'a message';
  } else {
    const media = translateClientDBMediaInfosToMedia(clientDBMessageInfo);
    pinnedContent = contentStringForMediaArray(media);
  }
  return pinnedContent;
}

export {
  translateClientDBMediaInfoToImage,
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBMessageInfosToRawMessageInfos,
  convertMessageStoreOperationsToClientDBOperations,
  translateClientDBMediaInfosToMedia,
  getPinnedContentFromClientDBMessageInfo,
  translateClientDBThreadMessageInfos,
};
