// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
} from '../actions/message-actions.js';
import type { MediaMetadataUploadAction } from '../actions/upload-actions.js';
import {
  useMediaMetadataUpload,
  updateMultimediaMessageMediaActionType,
} from '../actions/upload-actions.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../media/media-utils.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useSendComposableDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type { Media } from '../types/media-types.js';
import type {
  RawMultimediaMessageInfo,
  SendMessagePayload,
} from '../types/message-types.js';
import { getMediaMessageServerDBContentsFromMedia } from '../types/messages/media.js';
import type { RawTextMessageInfo } from '../types/messages/text.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from '../types/redux-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from '../types/thread-types-enum.js';
import {
  blobHashFromBlobServiceURI,
  isBlobServiceURI,
} from '../utils/blob-service.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useInputStateContainerSendTextMessage(): (
  messageInfo: RawTextMessageInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  sidebarCreation: boolean,
) => Promise<SendMessagePayload> {
  const sendTextMessage = useSendTextMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();

  return React.useCallback(
    async (
      messageInfo: RawTextMessageInfo,
      threadInfo: ThreadInfo,
      parentThreadInfo: ?ThreadInfo,
      sidebarCreation: boolean,
    ) => {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      if (!threadTypeIsThick(threadInfo.type)) {
        const result = await sendTextMessage({
          threadID: messageInfo.threadID,
          localID,
          text: messageInfo.text,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      const messageID = uuid.v4();
      const time = Date.now();

      const recipients =
        threadInfo.type === thickThreadTypes.THICK_SIDEBAR && parentThreadInfo
          ? parentThreadInfo.members
          : threadInfo.members;
      const recipientsIDs = recipients.map(recipient => recipient.id);

      const result = await sendComposableDMOperation({
        type: dmOperationSpecificationTypes.OUTBOUND,
        op: {
          type: 'send_text_message',
          threadID: threadInfo.id,
          creatorID: messageInfo.creatorID,
          time,
          messageID,
          text: messageInfo.text,
        },
        // We need to use a different mechanism than `all_thread_members`
        // because when creating a thread, the thread might not yet
        // be in the store.
        recipients: {
          type: 'some_users',
          userIDs: recipientsIDs,
        },
        sendOnly: true,
        composableMessageID: localID,
      });

      if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
        const e: any = new Error('Failed to send message to all peers');
        e.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw e;
      }
      return {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      };
    },
    [sendComposableDMOperation, sendTextMessage],
  );
}

function useInputStateContainerSendMultimediaMessage(): (
  messageInfo: RawMultimediaMessageInfo,
  sidebarCreation: boolean,
  isLegacy: boolean,
) => Promise<SendMessagePayload> {
  const sendMultimediaMessage = useSendMultimediaMessage();
  const legacySendMultimediaMessage = useLegacySendMultimediaMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const uploadMediaMetadata = useMediaMetadataUpload();
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      messageInfo: RawMultimediaMessageInfo,
      sidebarCreation: boolean,
      isLegacy: boolean,
    ) => {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );

      const threadInfo = threadInfos[messageInfo.threadID];
      const isThickThread = threadInfo && threadTypeIsThick(threadInfo.type);

      if (!isThickThread && isLegacy) {
        const { messageMedia } = await migrateMessageMediaToKeyserver(
          messageInfo,
          uploadMediaMetadata,
          dispatch,
        );
        const mediaIDs = [];
        for (const { id } of messageMedia) {
          mediaIDs.push(id);
        }
        const result = await legacySendMultimediaMessage({
          threadID: messageInfo.threadID,
          localID,
          mediaIDs,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      if (!isThickThread && !isLegacy) {
        const { messageMedia } = await migrateMessageMediaToKeyserver(
          messageInfo,
          uploadMediaMetadata,
          dispatch,
        );
        const mediaMessageContents =
          getMediaMessageServerDBContentsFromMedia(messageMedia);
        const result = await sendMultimediaMessage({
          threadID: messageInfo.threadID,
          localID,
          mediaMessageContents,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      const messageID = uuid.v4();
      const time = Date.now();

      const result = await sendComposableDMOperation({
        type: dmOperationSpecificationTypes.OUTBOUND,
        op: {
          type: 'send_multimedia_message',
          threadID: threadInfo.id,
          creatorID: messageInfo.creatorID,
          time: Date.now(),
          messageID,
          media: messageInfo.media,
        },
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
        sendOnly: true,
        composableMessageID: localID,
      });

      if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
        const e: any = new Error('Failed to send message to all peers');
        e.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw e;
      }
      return {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      };
    },
    [
      dispatch,
      legacySendMultimediaMessage,
      sendComposableDMOperation,
      sendMultimediaMessage,
      threadInfos,
      uploadMediaMetadata,
    ],
  );
}

function mediaIDIsKeyserverID(mediaID: string): boolean {
  return mediaID.indexOf('|') !== -1;
}

type MediaIDUpdates = { +[string]: { id: string, thumbnailID?: string } };

async function migrateMessageMediaToKeyserver(
  messageInfo: RawMultimediaMessageInfo,
  uploadMediaMetadata: MediaMetadataUploadAction,
  dispatch: Dispatch,
): Promise<{
  +messageMedia: $ReadOnlyArray<Media>,
  +mediaIDUpdates: MediaIDUpdates,
}> {
  const newMedia = [];
  let mediaIDUpdates: MediaIDUpdates = {};
  for (const media of messageInfo.media) {
    if (
      mediaIDIsKeyserverID(media.id) ||
      (media.type !== 'encrypted_photo' && media.type !== 'encrypted_video')
    ) {
      newMedia.push(media);
      continue;
    }

    const mediaURI = encryptedMediaBlobURI(media);
    invariant(
      isBlobServiceURI(mediaURI),
      'non-blob media had non-keyserver ID',
    );

    // This is only to determine server-side if media is photo or video.
    // We can mock mime type to represent one of them.
    const mimeType =
      media.type === 'encrypted_photo' ? 'image/jpeg' : 'video/mp4';
    const blobHash = blobHashFromBlobServiceURI(mediaURI);
    const { id } = await uploadMediaMetadata({
      keyserverOrThreadID: messageInfo.threadID,
      uploadInput: {
        blobHash,
        mimeType,
        dimensions: media.dimensions,
        thumbHash: media.thumbHash,
        encryptionKey: media.encryptionKey,
        loop: media.loop,
      },
    });

    if (media.type !== 'encrypted_video') {
      mediaIDUpdates = {
        ...mediaIDUpdates,
        [media.id]: { id },
      };
      newMedia.push({
        ...media,
        id,
      });
      continue;
    }

    const thumbnailMediaURI = encryptedVideoThumbnailBlobURI(media);
    invariant(
      isBlobServiceURI(thumbnailMediaURI),
      'non-blob media had non-keyserver thumbnail ID',
    );

    const thumbnailBlobHash = blobHashFromBlobServiceURI(thumbnailMediaURI);
    const { id: thumbnailID } = await uploadMediaMetadata({
      keyserverOrThreadID: messageInfo.threadID,
      uploadInput: {
        blobHash: thumbnailBlobHash,
        mimeType: 'image/jpeg',
        dimensions: media.dimensions,
        thumbHash: media.thumbnailThumbHash,
        encryptionKey: media.thumbnailEncryptionKey,
        loop: false,
      },
    });

    mediaIDUpdates = {
      ...mediaIDUpdates,
      [media.id]: { id, thumbnailID },
    };
    newMedia.push({
      ...media,
      id,
      thumbnailID,
    });
  }

  for (const [prevID, { id, thumbnailID }] of Object.entries(mediaIDUpdates)) {
    dispatch({
      type: updateMultimediaMessageMediaActionType,
      payload: {
        messageID: messageInfo.localID,
        currentMediaID: prevID,
        mediaUpdate: {
          id,
          ...(thumbnailID ? { thumbnailID } : {}),
        },
      },
    });
  }

  return {
    messageMedia: newMedia,
    mediaIDUpdates,
  };
}

export {
  useInputStateContainerSendTextMessage,
  useInputStateContainerSendMultimediaMessage,
};
