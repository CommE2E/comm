// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  type ProcessHolders,
  useProcessBlobHolders,
} from '../actions/holder-actions.js';
import {
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
} from '../actions/message-actions.js';
import type { MediaMetadataReassignmentAction } from '../actions/upload-actions.js';
import {
  useMediaMetadataReassignment,
  updateMultimediaMessageMediaActionType,
} from '../actions/upload-actions.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../media/media-utils.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useSendComposableDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type { BlobOperation } from '../types/holder-types.js';
import type {
  EncryptedImage,
  EncryptedVideo,
  Media,
} from '../types/media-types.js';
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
import { SendMessageError } from '../utils/errors.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

type MediaIDUpdatePayload = { +id: string, +thumbnailID?: string };
type MediaIDUpdates = { +[string]: MediaIDUpdatePayload };
export type SendMultimediaMessagePayload = {
  +result: SendMessagePayload,
  +mediaIDUpdates?: MediaIDUpdates,
};

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
        const error = new SendMessageError(
          'Failed to send message to all peers',
          localID,
          messageInfo.threadID,
        );
        error.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw error;
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
) => Promise<SendMultimediaMessagePayload> {
  const sendMultimediaMessage = useSendMultimediaMessage();
  const legacySendMultimediaMessage = useLegacySendMultimediaMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const reassignThickThreadMedia = useMediaMetadataReassignment();
  const processHolders = useProcessBlobHolders();
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
        const { messageMedia, mediaIDUpdates } =
          await migrateMessageMediaToKeyserver(
            messageInfo,
            reassignThickThreadMedia,
            dispatch,
            processHolders,
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
          result: {
            localID,
            serverID: result.id,
            threadID: messageInfo.threadID,
            time: result.time,
          },
          mediaIDUpdates,
        };
      }

      if (!isThickThread && !isLegacy) {
        const { messageMedia, mediaIDUpdates } =
          await migrateMessageMediaToKeyserver(
            messageInfo,
            reassignThickThreadMedia,
            dispatch,
            processHolders,
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
          result: {
            localID,
            serverID: result.id,
            threadID: messageInfo.threadID,
            time: result.time,
          },
          mediaIDUpdates,
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
        const error = new SendMessageError(
          'Failed to send message to all peers',
          localID,
          messageInfo.threadID,
        );
        error.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw error;
      }
      return {
        result: {
          localID,
          serverID: messageID,
          threadID: messageInfo.threadID,
          time,
        },
      };
    },
    [
      dispatch,
      processHolders,
      legacySendMultimediaMessage,
      reassignThickThreadMedia,
      sendComposableDMOperation,
      sendMultimediaMessage,
      threadInfos,
    ],
  );
}

function mediaIDIsKeyserverID(mediaID: string): boolean {
  return mediaID.indexOf('|') !== -1;
}

async function migrateMessageMediaToKeyserver(
  messageInfo: RawMultimediaMessageInfo,
  reassignMediaMetadata: MediaMetadataReassignmentAction,
  dispatch: Dispatch,
  processHolders: ProcessHolders,
): Promise<{
  +messageMedia: $ReadOnlyArray<Media>,
  +mediaIDUpdates: MediaIDUpdates,
}> {
  const messageMedia = [],
    holderActions: Array<BlobOperation> = [];
  let mediaIDUpdates: MediaIDUpdates = {};

  const processMediaChanges = (
    prevMediaID: string,
    changes: {
      ...MediaIDUpdatePayload,
      +blobsToRemoveHolder: $ReadOnlyArray<string>,
    },
  ) => {
    const { blobsToRemoveHolder, ...mediaUpdate } = changes;
    const newHolderActions = blobsToRemoveHolder.map(blobHash => ({
      type: 'remove_holder',
      blobHash,
    }));
    holderActions.push(...newHolderActions);

    mediaIDUpdates = { ...mediaIDUpdates, [prevMediaID]: mediaUpdate };
    dispatch({
      type: updateMultimediaMessageMediaActionType,
      payload: {
        messageID: messageInfo.localID,
        currentMediaID: prevMediaID,
        mediaUpdate,
      },
    });
  };

  const reassignmentPromises = messageInfo.media.map(async media => {
    if (
      mediaIDIsKeyserverID(media.id) ||
      (media.type !== 'encrypted_photo' && media.type !== 'encrypted_video')
    ) {
      messageMedia.push(media);
      return;
    }

    const mediaURI = encryptedMediaBlobURI(media);
    invariant(
      isBlobServiceURI(mediaURI),
      'thick thread media should be blob-hosted',
    );

    // This is only to determine server-side if media is photo or video.
    // We can mock mime type to represent one of them.
    const mimeType =
      media.type === 'encrypted_photo' ? 'image/jpeg' : 'video/mp4';
    const blobHash = blobHashFromBlobServiceURI(mediaURI);
    const mediaReassignmentPromise = reassignMediaMetadata({
      keyserverOrThreadID: messageInfo.threadID,
      mediaMetadataInput: {
        blobHash,
        mimeType,
        dimensions: media.dimensions,
        thumbHash: media.thumbHash,
        encryptionKey: media.encryptionKey,
        loop: media.loop,
      },
    });

    if (media.type !== 'encrypted_video') {
      const { id } = await mediaReassignmentPromise;

      const updatedMedia: EncryptedImage = { ...media, id };
      messageMedia.push(updatedMedia);

      const mediaChanges = { id, blobsToRemoveHolder: [blobHash] };
      processMediaChanges(media.id, mediaChanges);

      return;
    }

    const thumbnailMediaURI = encryptedVideoThumbnailBlobURI(media);
    invariant(
      isBlobServiceURI(thumbnailMediaURI),
      'thick thread media thumbnail should be blob-hosted',
    );

    const thumbnailBlobHash = blobHashFromBlobServiceURI(thumbnailMediaURI);
    const thumbnailReassignmentPromise = reassignMediaMetadata({
      keyserverOrThreadID: messageInfo.threadID,
      mediaMetadataInput: {
        blobHash: thumbnailBlobHash,
        mimeType: 'image/jpeg',
        dimensions: media.dimensions,
        thumbHash: media.thumbnailThumbHash,
        encryptionKey: media.thumbnailEncryptionKey,
        loop: false,
      },
    });

    const [{ id }, { id: thumbnailID }] = await Promise.all([
      mediaReassignmentPromise,
      thumbnailReassignmentPromise,
    ]);

    const updatedMedia: EncryptedVideo = { ...media, id, thumbnailID };
    messageMedia.push(updatedMedia);

    const mediaChanges = {
      id,
      thumbnailID,
      blobsToRemoveHolder: [blobHash, thumbnailBlobHash],
    };
    processMediaChanges(media.id, mediaChanges);
  });

  await Promise.all(reassignmentPromises);
  void processHolders(holderActions);

  return {
    messageMedia,
    mediaIDUpdates,
  };
}

export {
  useInputStateContainerSendTextMessage,
  useInputStateContainerSendMultimediaMessage,
};
