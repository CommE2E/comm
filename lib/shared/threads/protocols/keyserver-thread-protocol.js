// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ProcessHolders } from '../../../actions/holder-actions.js';
import {
  sendEditMessageActionTypes,
  sendReactionMessageActionTypes,
} from '../../../actions/message-actions.js';
import { changeThreadSettingsActionTypes } from '../../../actions/thread-actions.js';
import {
  type MediaMetadataReassignmentAction,
  updateMultimediaMessageMediaActionType,
} from '../../../actions/upload-actions.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../../../media/media-utils.js';
import type { TunnelbrokerSocketState } from '../../../tunnelbroker/tunnelbroker-context.js';
import type { BlobOperation } from '../../../types/holder-types.js';
import {
  type EncryptedImage,
  type EncryptedVideo,
  type Media,
} from '../../../types/media-types.js';
import { messageTypes } from '../../../types/message-types-enum.js';
import {
  type MediaIDUpdatePayload,
  type MediaIDUpdates,
  type RawMultimediaMessageInfo,
  type RawMessageInfo,
} from '../../../types/message-types.js';
import { getMediaMessageServerDBContentsFromMedia } from '../../../types/messages/media.js';
import type { RawReactionMessageInfo } from '../../../types/messages/reaction.js';
import type { Dispatch } from '../../../types/redux-types.js';
import { thinThreadTypes } from '../../../types/thread-types-enum.js';
import {
  blobHashFromBlobServiceURI,
  isBlobServiceURI,
} from '../../../utils/blob-service.js';
import {
  getMessageForException,
  SendMessageError,
} from '../../../utils/errors.js';
import { pendingSidebarURLPrefix } from '../../../utils/validation-utils.js';
import { getNextLocalID } from '../../id-utils.js';
import type {
  ThreadProtocol,
  ProtocolSendTextMessageInput,
  SendTextMessageUtils,
  ProtocolSendMultimediaMessageInput,
  SendMultimediaMessageUtils,
  ProtocolEditTextMessageInput,
  EditTextMessageUtils,
  ProtocolChangeThreadSettingsInput,
  ChangeThreadSettingsUtils,
  ProtocolCreateEntryInput,
  CreateEntryUtils,
  ProtocolDeleteEntryInput,
  DeleteEntryUtils,
  ProtocolEditEntryInput,
  EditEntryUtils,
  ProtocolSetThreadUnreadStatusInput,
  SetThreadUnreadStatusUtils,
  ProtocolSendReactionInput,
  SendReactionUtils,
  AddThreadMembersUtils,
  ProtocolAddThreadMembersInput,
  ProtocolUpdateSubscriptionInput,
  UpdateSubscriptionUtils,
} from '../thread-spec.js';

const keyserverThreadProtocol: ThreadProtocol = Object.freeze({
  sendTextMessage: async (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ) => {
    const { messageInfo, sidebarCreation } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    const result = await utils.sendKeyserverTextMessage({
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
  },

  sendMultimediaMessage: async (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ) => {
    const { messageInfo, isLegacy, sidebarCreation } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const {
      reassignThickThreadMedia,
      dispatch,
      processHolders,
      legacyKeyserverSendMultimediaMessage,
      sendKeyserverMultimediaMessage,
    } = utils;
    if (isLegacy) {
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
      const result = await legacyKeyserverSendMultimediaMessage({
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

    const { messageMedia, mediaIDUpdates } =
      await migrateMessageMediaToKeyserver(
        messageInfo,
        reassignThickThreadMedia,
        dispatch,
        processHolders,
      );
    const mediaMessageContents =
      getMediaMessageServerDBContentsFromMedia(messageMedia);
    const result = await sendKeyserverMultimediaMessage({
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
  },

  editTextMessage: async (
    message: ProtocolEditTextMessageInput,
    utils: EditTextMessageUtils,
  ) => {
    const { messageID, newText } = message;
    const editMessagePromise = (async () => {
      const result = await utils.keyserverEditMessage({
        targetMessageID: messageID,
        text: newText,
      });

      return ({
        newMessageInfos: result.newMessageInfos,
      }: { +newMessageInfos: $ReadOnlyArray<RawMessageInfo> });
    })();

    void utils.dispatchActionPromise(
      sendEditMessageActionTypes,
      editMessagePromise,
    );

    await editMessagePromise;
  },

  changeThreadSettings: async (
    protocolInput: ProtocolChangeThreadSettingsInput,
    utils: ChangeThreadSettingsUtils,
  ) => {
    const { threadInfo, ...rest } = protocolInput.input;
    return await utils.keyserverChangeThreadSettings({ ...rest });
  },

  supportsCalendarHistory: true,

  calendarIsOnline: (
    tunnelbrokerSocketState: TunnelbrokerSocketState,
    isKeyserverConnected: boolean,
  ) => isKeyserverConnected,

  createCalendarEntry: (
    protocolInput: ProtocolCreateEntryInput,
    utils: CreateEntryUtils,
  ) => utils.keyserverCreateEntry(protocolInput.input.createEntryInfo),

  deleteCalendarEntry: (
    protocolInput: ProtocolDeleteEntryInput,
    utils: DeleteEntryUtils,
  ) => utils.keyserverDeleteEntry(protocolInput.input.deleteEntryInfo),

  editCalendarEntry: (
    protocolInput: ProtocolEditEntryInput,
    utils: EditEntryUtils,
  ) => utils.keyserverEditEntry(protocolInput.input.saveEntryInfo),

  setThreadUnreadStatus: (
    input: ProtocolSetThreadUnreadStatusInput,
    utils: SetThreadUnreadStatusUtils,
  ) => {
    const {
      input: { threadInfo, ...rest },
    } = input;
    return utils.keyserverSetThreadUnreadStatus(rest);
  },

  sendReaction: async (
    input: ProtocolSendReactionInput,
    utils: SendReactionUtils,
  ) => {
    const {
      threadInfo,
      viewerID,
      messageID,
      reaction,
      action,
      showErrorAlert,
    } = input;
    const threadID = threadInfo.id;
    const localID = getNextLocalID();

    const reactionMessagePromise = (async () => {
      try {
        const result = await utils.keyserverSendReaction({
          threadID,
          localID,
          targetMessageID: messageID,
          reaction,
          action,
        });
        return {
          localID,
          serverID: result.id,
          threadID,
          time: result.time,
        };
      } catch (e) {
        showErrorAlert();
        const exceptionMessage = getMessageForException(e) ?? '';
        throw new SendMessageError(
          `Exception while sending reaction: ${exceptionMessage}`,
          localID,
          threadID,
        );
      }
    })();

    const startingPayload: RawReactionMessageInfo = {
      type: messageTypes.REACTION,
      threadID,
      localID,
      creatorID: viewerID,
      time: Date.now(),
      targetMessageID: messageID,
      reaction,
      action,
    };

    void utils.dispatchActionPromise(
      sendReactionMessageActionTypes,
      reactionMessagePromise,
      undefined,
      startingPayload,
    );

    await reactionMessagePromise;
  },

  addThreadMembers: async (
    input: ProtocolAddThreadMembersInput,
    utils: AddThreadMembersUtils,
  ) => {
    const { threadInfo, newMemberIDs } = input;

    const changeThreadSettingsInput = {
      threadInfo,
      threadID: threadInfo.id,
      changes: { newMemberIDs },
    };

    const addMembersPromise = utils.changeThreadSettings(
      changeThreadSettingsInput,
    );

    void utils.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      addMembersPromise,
    );
    await addMembersPromise;
  },

  updateSubscription: (
    protocolInput: ProtocolUpdateSubscriptionInput,
    utils: UpdateSubscriptionUtils,
  ) => {
    const { threadInfo, ...rest } = protocolInput.input;
    return utils.keyserverUpdateSubscription(rest);
  },

  allowsDeletingSidebarSource: true,

  presentationDetails: {
    membershipChangesShownInThreadPreview: false,
    usersWithoutDeviceListExcludedFromSearchResult: false,
    supportsMediaGallery: true,
    chatThreadListIcon: 'server',
    breadCrumbs: (ancestorPath: React.Node) => ancestorPath,
  },

  uploadMultimediaToKeyserver: true,

  canActionsTargetPendingMessages: false,

  sidebarConfig: {
    sidebarThreadType: thinThreadTypes.SIDEBAR,
    pendingSidebarURLPrefix: pendingSidebarURLPrefix,
  },
});

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

export { keyserverThreadProtocol };
