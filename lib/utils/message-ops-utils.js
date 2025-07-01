// @flow

import _keyBy from 'lodash/fp/keyBy.js';

import {
  contentStringForMediaArray,
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../media/media-utils.js';
import { messageID } from '../shared/id-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type {
  EncryptedVideo,
  Media,
  ClientDBMediaInfo,
  Image,
  Video,
} from '../types/media-types';
import {
  messageTypes,
  assertMessageType,
} from '../types/message-types-enum.js';
import {
  type ClientDBMessageInfo,
  type RawMessageInfo,
  type ClientDBThreadMessageInfo,
  type ThreadMessageInfo,
  type ClientDBLocalMessageInfo,
  type MessageStoreLocalMessageInfos,
} from '../types/message-types.js';
import type { MediaMessageServerDBContent } from '../types/messages/media.js';

function translateMediaToClientDBMediaInfos(
  media: $ReadOnlyArray<Media>,
): $ReadOnlyArray<ClientDBMediaInfo> {
  const clientDBMediaInfos = [];
  for (const m of media) {
    const type: 'photo' | 'video' =
      m.type === 'encrypted_photo'
        ? 'photo'
        : m.type === 'encrypted_video'
          ? 'video'
          : m.type;

    const mediaURI =
      m.type === 'encrypted_photo' || m.type === 'encrypted_video'
        ? encryptedMediaBlobURI(m)
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
        thumb_hash: m.thumbHash ?? undefined,
      }),
    });
    if (m.type === 'video' || m.type === 'encrypted_video') {
      const thumbnailURI =
        m.type === 'encrypted_video'
          ? encryptedVideoThumbnailBlobURI(m)
          : m.thumbnailURI;
      clientDBMediaInfos.push({
        id: m.thumbnailID,
        uri: thumbnailURI,
        type: 'photo',
        extras: JSON.stringify({
          dimensions: m.dimensions,
          loop: false,
          encryption_key: m.thumbnailEncryptionKey,
          thumb_hash: m.thumbnailThumbHash ?? undefined,
        }),
      });
    }
  }
  return clientDBMediaInfos;
}

function translateClientDBMediaInfoToImage(
  clientDBMediaInfo: ClientDBMediaInfo,
): Image {
  const { dimensions, local_media_selection, thumb_hash } = JSON.parse(
    clientDBMediaInfo.extras,
  );

  if (!local_media_selection) {
    return {
      id: clientDBMediaInfo.id,
      uri: clientDBMediaInfo.uri,
      type: 'photo',
      dimensions: dimensions,
      thumbHash: thumb_hash,
    };
  }
  return {
    id: clientDBMediaInfo.id,
    uri: clientDBMediaInfo.uri,
    type: 'photo',
    dimensions: dimensions,
    localMediaSelection: local_media_selection,
    thumbHash: thumb_hash,
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
  if (
    !clientDBMessageInfo.media_infos ||
    clientDBMessageInfo.media_infos.length === 0
  ) {
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
      const {
        dimensions,
        encryption_key: encryptionKey,
        thumb_hash: thumbHash,
      } = extras;

      let image;
      if (encryptionKey) {
        image = {
          id: media.uploadID,
          type: 'encrypted_photo',
          blobURI: mediaMap[media.uploadID].uri,
          dimensions,
          encryptionKey,
          thumbHash,
        };
      } else {
        image = {
          id: media.uploadID,
          type: 'photo',
          uri: mediaMap[media.uploadID].uri,
          dimensions,
          thumbHash,
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

      const {
        encryption_key: thumbnailEncryptionKey,
        thumb_hash: thumbnailThumbHash,
      } = JSON.parse(mediaMap[media.thumbnailUploadID].extras);
      if (encryptionKey) {
        const video: EncryptedVideo = {
          id: media.uploadID,
          type: 'encrypted_video',
          blobURI: mediaMap[media.uploadID].uri,
          dimensions,
          loop,
          encryptionKey,
          thumbnailID: media.thumbnailUploadID,
          thumbnailBlobURI: mediaMap[media.thumbnailUploadID].uri,
          thumbnailEncryptionKey,
          thumbnailThumbHash,
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
          thumbnailThumbHash,
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

type TranslatedThreadMessageInfo = {
  +startReached: boolean,
};
export type TranslatedThreadMessageInfos = {
  +[threadID: string]: TranslatedThreadMessageInfo,
};
function translateClientDBThreadMessageInfos(
  clientDBThreadMessageInfo: $ReadOnlyArray<ClientDBThreadMessageInfo>,
): TranslatedThreadMessageInfos {
  return Object.fromEntries(
    clientDBThreadMessageInfo.map((threadInfo: ClientDBThreadMessageInfo) => [
      threadInfo.id,
      {
        startReached: threadInfo.start_reached === '1',
      },
    ]),
  );
}

function translateThreadMessageInfoToClientDBThreadMessageInfo(
  id: string,
  threadMessageInfo: ThreadMessageInfo | TranslatedThreadMessageInfo,
): ClientDBThreadMessageInfo {
  const startReached = threadMessageInfo.startReached ? 1 : 0;

  return {
    id,
    start_reached: startReached.toString(),
  };
}

function translateClientDBLocalMessageInfos(
  clientDBLocalMessageInfos: $ReadOnlyArray<ClientDBLocalMessageInfo>,
): MessageStoreLocalMessageInfos {
  return Object.fromEntries(
    clientDBLocalMessageInfos.map(
      (localMessageInfo: ClientDBLocalMessageInfo) => [
        localMessageInfo.id,
        JSON.parse(localMessageInfo.localMessageInfo),
      ],
    ),
  );
}

function getPinnedContentFromClientDBMessageInfo(
  clientDBMessageInfo: ClientDBMessageInfo,
): string {
  const { media_infos } = clientDBMessageInfo;

  let pinnedContent;
  if (!media_infos || media_infos.length === 0) {
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
  translateClientDBMediaInfosToMedia,
  getPinnedContentFromClientDBMessageInfo,
  translateClientDBThreadMessageInfos,
  translateThreadMessageInfoToClientDBThreadMessageInfo,
  translateClientDBLocalMessageInfos,
};
