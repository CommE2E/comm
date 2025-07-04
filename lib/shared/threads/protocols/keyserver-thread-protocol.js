// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ProcessHolders } from '../../../actions/holder-actions.js';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendDeleteMessageActionTypes,
  sendEditMessageActionTypes,
  sendReactionMessageActionTypes,
} from '../../../actions/message-actions.js';
import {
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  newThreadActionTypes,
} from '../../../actions/thread-action-types.js';
import {
  type MediaMetadataReassignmentAction,
  updateMultimediaMessageMediaActionType,
} from '../../../actions/upload-actions.js';
import genesis from '../../../facts/genesis.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../../../media/media-utils.js';
import { getThinThreadPermissionsBlobs } from '../../../permissions/keyserver-permissions.js';
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
import type {
  ThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
  ThinRawThreadInfo,
  MemberInfoSansPermissions,
  RawThreadInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import { minimallyEncodeThreadCurrentUserInfo } from '../../../types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from '../../../types/redux-types.js';
import { defaultThreadSubscription } from '../../../types/subscription-types.js';
import {
  assertThinThreadType,
  thinThreadTypes,
  threadTypes,
  type ThreadType,
} from '../../../types/thread-types-enum.js';
import type { ClientDBThreadInfo } from '../../../types/thread-types.js';
import {
  blobHashFromBlobServiceURI,
  isBlobServiceURI,
} from '../../../utils/blob-service.js';
import {
  getMessageForException,
  SendMessageError,
} from '../../../utils/errors.js';
import {
  isSchemaRegExp,
  pendingSidebarURLPrefix,
  thickIDRegex,
} from '../../../utils/validation-utils.js';
import { generatePendingThreadColor } from '../../color-utils.js';
import { getNextLocalID } from '../../id-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import {
  getCommunity,
  getContainingThreadID,
  threadIsPending,
  threadOtherMembers,
} from '../../thread-utils.js';
import { identifyInvalidatedThreads } from '../../updates/utils.js';
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
  ProtocolLeaveThreadInput,
  LeaveThreadUtils,
  FetchMessageUtils,
  ProtocolFetchMessageInput,
  ProtocolCreatePendingThreadInput,
  CreateRealThreadParameters,
  DeleteMessageUtils,
  ProtocolDeleteMessageInput,
  JoinThreadUtils,
  ProtocolJoinThreadInput,
} from '../thread-spec.js';
import { threadTypeIsSidebar } from '../thread-specs.js';

const keyserverThreadProtocol: ThreadProtocol<MemberInfoSansPermissions> =
  Object.freeze({
    sendTextMessage: async (
      message: ProtocolSendTextMessageInput,
      utils: SendTextMessageUtils,
    ) => {
      const { messageInfo, sidebarCreation, threadInfo, parentThreadInfo } =
        message;
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      await utils.sideEffectsFunction(
        messageInfo,
        threadInfo,
        parentThreadInfo,
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

    leaveThread: async (
      input: ProtocolLeaveThreadInput,
      utils: LeaveThreadUtils,
    ) => {
      const threadID = input.threadInfo.id;
      const promise = utils.keyserverLeaveThread({ threadID });
      void utils.dispatchActionPromise(leaveThreadActionTypes, promise, {
        customKeyName: `${leaveThreadActionTypes.started}:${threadID}`,
      });
      const result = await promise;
      const invalidated = identifyInvalidatedThreads(
        result.updatesResult.newUpdates,
      );
      return {
        invalidatedThreads: [...invalidated],
      };
    },

    convertClientDBThreadInfo: (
      clientDBThreadInfo: ClientDBThreadInfo,
      members: $ReadOnlyArray<MemberInfoSansPermissions>,
      roles: { +[id: string]: RoleInfo },
      currentUser: ThreadCurrentUserInfo,
    ) => {
      const thinThreadType = assertThinThreadType(clientDBThreadInfo.type);

      let rawThreadInfo: ThinRawThreadInfo = {
        minimallyEncoded: true,
        id: clientDBThreadInfo.id,
        type: thinThreadType,
        name: clientDBThreadInfo.name,
        description: clientDBThreadInfo.description,
        color: clientDBThreadInfo.color,
        creationTime: Number(clientDBThreadInfo.creationTime),
        parentThreadID: clientDBThreadInfo.parentThreadID,
        containingThreadID: clientDBThreadInfo.containingThreadID,
        community: clientDBThreadInfo.community,
        members,
        roles,
        currentUser,
        repliesCount: clientDBThreadInfo.repliesCount,
        pinnedCount: clientDBThreadInfo.pinnedCount,
      };

      if (clientDBThreadInfo.sourceMessageID) {
        rawThreadInfo = {
          ...rawThreadInfo,
          sourceMessageID: clientDBThreadInfo.sourceMessageID,
        };
      }

      if (clientDBThreadInfo.avatar) {
        rawThreadInfo = {
          ...rawThreadInfo,
          avatar: JSON.parse(clientDBThreadInfo.avatar),
        };
      }

      return rawThreadInfo;
    },

    fetchMessages: async (
      input: ProtocolFetchMessageInput,
      utils: FetchMessageUtils,
    ) => {
      const { oldestMessageServerID, threadID, numMessagesToFetch } = input;
      if (oldestMessageServerID) {
        await utils.dispatchActionPromise(
          fetchMessagesBeforeCursorActionTypes,
          utils.keyserverFetchMessagesBeforeCursor({
            threadID,
            beforeMessageID: oldestMessageServerID,
            numMessagesToFetch,
          }),
        );
      } else {
        await utils.dispatchActionPromise(
          fetchMostRecentMessagesActionTypes,
          utils.keyserverFetchMostRecentMessages({
            threadID,
            numMessagesToFetch,
          }),
        );
      }
    },

    createPendingThread: (input: ProtocolCreatePendingThreadInput) => {
      const {
        threadID,
        creationTime,
        membershipPermissions,
        role,
        memberIDs,
        createPendingThreadArgs: {
          threadType,
          name,
          threadColor,
          parentThreadInfo,
          members,
          sourceMessageID,
        },
      } = input;
      const thinThreadType = assertThinThreadType(threadType);
      return {
        minimallyEncoded: true,
        id: threadID,
        type: thinThreadType,
        name: name ?? null,
        description: null,
        color: threadColor ?? generatePendingThreadColor(memberIDs),
        creationTime,
        parentThreadID: parentThreadInfo?.id ?? null,
        containingThreadID: getContainingThreadID(
          parentThreadInfo,
          thinThreadType,
        ),
        community: getCommunity(parentThreadInfo),
        members: members.map(member => ({
          id: member.id,
          role: role.id,
          minimallyEncoded: true,
          isSender: false,
        })),
        roles: {
          [role.id]: role,
        },
        currentUser: minimallyEncodeThreadCurrentUserInfo({
          role: role.id,
          permissions: membershipPermissions,
          subscription: defaultThreadSubscription,
          unread: false,
        }),
        repliesCount: 0,
        sourceMessageID,
        pinnedCount: 0,
      };
    },

    couldBeCreatedFromPendingThread: (thread: RawThreadInfo) => {
      return (
        thread.parentThreadID === genesis().id ||
        threadTypeIsSidebar(thread.type)
      );
    },

    // Channels inside GENESIS were used in place of thick threads before thick
    // threads were launched, and as such we mirror "freezing" behavior between
    // them and thick threads. Note that we exclude the GENESIS community root
    // here, as the root itself has never been used in place of thick threads.
    // Also note that grandchild channels of GENESIS get this behavior too,
    // even though we don't currently support channels inside thick threads.
    canBeFrozen: (thread: ThreadInfo) => {
      if (getCommunity(thread) !== genesis().id) {
        return false;
      }
      return thread.id !== genesis().id;
    },

    pendingThreadType,

    createRealThreadFromPendingThread: async (
      params: CreateRealThreadParameters,
    ) => {
      const {
        threadInfo,
        viewerID,
        sourceMessageID,
        createNewThinThread,
        calendarQuery,
        dispatchActionPromise,
      } = params;
      if (!threadIsPending(threadInfo.id)) {
        return {
          threadID: threadInfo.id,
          threadType: threadInfo.type,
        };
      }

      const otherMemberIDs = threadOtherMembers(
        threadInfo.members,
        viewerID,
      ).map(member => member.id);

      if (threadInfo.type === threadTypes.SIDEBAR) {
        invariant(
          sourceMessageID,
          'sourceMessageID should be set when creating a sidebar',
        );
        invariant(
          threadInfo.parentThreadID,
          'parentThreadID should be set when creating a sidebar',
        );
        const resultPromise = createNewThinThread({
          type: threadTypes.SIDEBAR,
          initialMemberIDs: otherMemberIDs,
          color: threadInfo.color,
          sourceMessageID,
          parentThreadID: threadInfo.parentThreadID,
          name: threadInfo.name,
          calendarQuery,
        });
        void dispatchActionPromise(newThreadActionTypes, resultPromise);
        const result = await resultPromise;
        return {
          threadID: result.newThreadID,
          threadType: threadTypes.SIDEBAR,
        };
      }

      const type = pendingThreadType(otherMemberIDs.length);

      const resultPromise = createNewThinThread({
        type,
        initialMemberIDs: otherMemberIDs,
        color: threadInfo.color,
        calendarQuery,
      });
      void dispatchActionPromise(newThreadActionTypes, resultPromise);
      const result = await resultPromise;

      return {
        threadID: result.newThreadID,
        threadType: type,
      };
    },

    getRolePermissionBlobs: (threadType: ThreadType) => {
      const thinThreadType = assertThinThreadType(threadType);
      return getThinThreadPermissionsBlobs(thinThreadType);
    },

    deleteMessage: async (
      input: ProtocolDeleteMessageInput,
      utils: DeleteMessageUtils,
    ) => {
      const promise = utils.keyserverDeleteMessage({
        targetMessageID: input.messageID,
      });
      void utils.dispatchActionPromise(sendDeleteMessageActionTypes, promise);
      await promise;
    },

    joinThread: async (
      input: ProtocolJoinThreadInput,
      utils: JoinThreadUtils,
    ) => {
      const { rawThreadInfo } = input;
      const query = utils.calendarQuery();
      const request = {
        threadID: rawThreadInfo.id,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [rawThreadInfo.id] },
          ],
        },
      };
      invariant(request, 'request should be provided');
      return await utils.keyserverJoinThread(request);
    },

    threadIDMatchesProtocol: (threadID: string) => {
      return isSchemaRegExp.test(threadID) && !thickIDRegex.test(threadID);
    },

    allowsDeletingSidebarSource: true,

    presentationDetails: {
      membershipChangesShownInThreadPreview: false,
      usersWithoutDeviceListExcludedFromSearchResult: false,
      supportsMediaGallery: true,
      nativeChatThreadListIcon: 'server',
      webChatThreadListIcon: 'server',
      threadAncestorLabel: (ancestorPath: React.Node) => ancestorPath,
      threadSearchHeaderShowsGenesis: true,
    },

    uploadMultimediaMetadataToKeyserver: true,

    canActionsTargetPendingMessages: false,

    sidebarConfig: {
      sidebarThreadType: thinThreadTypes.SIDEBAR,
      pendingSidebarURLPrefix: pendingSidebarURLPrefix,
    },

    messagesStoredOnServer: true,

    arePendingThreadsDescendantsOfGenesis: true,

    threadActivityUpdatedByDMActivityHandler: false,

    membershipMessageNotifAction: messageNotifyTypes.NONE,

    shouldConvertIDs: true,

    dataIsBackedUp: false,
  });

function pendingThreadType(numberOfOtherMembers: number) {
  if (numberOfOtherMembers === 0) {
    return threadTypes.GENESIS_PRIVATE;
  } else if (numberOfOtherMembers === 1) {
    return threadTypes.GENESIS_PERSONAL;
  } else {
    return threadTypes.COMMUNITY_SECRET_SUBTHREAD;
  }
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
      keyserverOrThreadIDForMetadata: messageInfo.threadID,
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
      keyserverOrThreadIDForMetadata: messageInfo.threadID,
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
