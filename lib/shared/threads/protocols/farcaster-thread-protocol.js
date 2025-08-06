// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { fetchMessagesBeforeCursorActionTypes } from '../../../actions/message-actions.js';
import type { RolePermissionBlobs } from '../../../permissions/keyserver-permissions.js';
import type { TunnelbrokerSocketState } from '../../../tunnelbroker/tunnelbroker-context.js';
import type { SetThreadUnreadStatusPayload } from '../../../types/activity-types.js';
import type {
  CreateEntryPayload,
  DeleteEntryResult,
  SaveEntryResult,
} from '../../../types/entry-types.js';
import type { Media } from '../../../types/media-types.js';
import { messageTypes } from '../../../types/message-types-enum.js';
import {
  type SendMessagePayload,
  type SendMultimediaMessagePayload,
  type FetchMessageInfosPayload,
  messageTruncationStatus,
  type RawMessageInfo,
} from '../../../types/message-types.js';
import type {
  MemberInfoSansPermissions,
  RawThreadInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import type { SubscriptionUpdateResult } from '../../../types/subscription-types.js';
import type { ThreadType } from '../../../types/thread-types-enum.js';
import { thickThreadTypes } from '../../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ThreadJoinPayload,
} from '../../../types/thread-types.js';
import { getIDFromLocalID } from '../../id-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import type {
  ThreadProtocol,
  ProtocolSendTextMessageInput,
  SendTextMessageUtils,
  ProtocolFetchMessageInput,
  FetchMessageUtils,
} from '../thread-spec.js';

function getUserID(fid: number): string {
  if (fid.toString() === '946308') {
    return '4BAD2150-2AE9-4566-9EA3-A76ED368C0D6';
  }
  return '2B6559A7-7352-4B08-8910-A9C27113ED5A';
}

const farcasterThreadProtocol: ThreadProtocol<MemberInfoSansPermissions> = {
  sendTextMessage: async (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ): Promise<SendMessagePayload> => {
    const { sendFarcasterTextMessage } = utils;
    const { messageInfo } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const time = Date.now();
    const result = await sendFarcasterTextMessage({
      groupId: 'efa192faf954b2f8',
      message: messageInfo.text,
    });

    return {
      localID,
      serverID: result.result.messageId,
      threadID: messageInfo.threadID,
      time: time,
    };
  },

  sendMultimediaMessage: async (): Promise<SendMultimediaMessagePayload> => {
    throw new Error('sendMultimediaMessage method is not yet implemented');
  },

  editTextMessage: async (): Promise<void> => {
    throw new Error('editTextMessage method is not yet implemented');
  },

  changeThreadSettings: async (): Promise<ChangeThreadSettingsPayload> => {
    throw new Error('changeThreadSettings method is not yet implemented');
  },

  supportsCalendarHistory: false,

  calendarIsOnline: (): boolean => {
    throw new Error('calendarIsOnline method is not yet implemented');
  },

  createCalendarEntry: async (): Promise<CreateEntryPayload> => {
    throw new Error('createCalendarEntry method is not yet implemented');
  },

  deleteCalendarEntry: async (): Promise<DeleteEntryResult> => {
    throw new Error('deleteCalendarEntry method is not yet implemented');
  },

  editCalendarEntry: async (): Promise<SaveEntryResult> => {
    throw new Error('editCalendarEntry method is not yet implemented');
  },

  setThreadUnreadStatus: async (): Promise<SetThreadUnreadStatusPayload> => {
    throw new Error('setThreadUnreadStatus method is not yet implemented');
  },

  sendReaction: async (): Promise<mixed> => {
    throw new Error('sendReaction method is not yet implemented');
  },

  addThreadMembers: async (): Promise<void> => {
    throw new Error('addThreadMembers method is not yet implemented');
  },

  updateSubscription: async (): Promise<SubscriptionUpdateResult> => {
    throw new Error('updateSubscription method is not yet implemented');
  },

  leaveThread: async () => {
    throw new Error('leaveThread method is not yet implemented');
  },

  convertClientDBThreadInfo: (): RawThreadInfo => {
    throw new Error('convertClientDBThreadInfo method is not yet implemented');
  },

  fetchMessages: async (
    input: ProtocolFetchMessageInput,
    utils: FetchMessageUtils,
  ): Promise<void> => {
    console.log('fetchMessages method is not yet implemented');
    const { fetchFarcasterMessages } = utils;
    const { threadID, numMessagesToFetch, currentNumberOfFetchedMessages } =
      input;

    let payload = {
      conversationId: 'efa192faf954b2f8',
      //TODO: no offset!
      offset: currentNumberOfFetchedMessages,
    };
    if (currentNumberOfFetchedMessages) {
      payload = {
        ...payload,
        limit: numMessagesToFetch,
      };
    }

    //FIXME
    payload = {
      ...payload,
      limit: 100,
    };

    const promise = (async () => {
      const {
        result: { messages },
      } = await fetchFarcasterMessages(payload);

      const rawMessageInfos: $ReadOnlyArray<RawMessageInfo> = messages
        .map(msg => {
          if (msg.type === 'group_membership_addition') {
            return ({
              id: msg.messageId,
              type: messageTypes.ADD_MEMBERS,
              threadID,
              creatorID: getUserID(msg.senderFid),
              time: parseInt(msg.serverTimestamp, 10),
              //TODO: use userID
              addedUserIDs: [msg.actionTargetUserContext.fid.toString()],
            }: RawMessageInfo);
          }

          if (msg.type === 'text' && !!msg?.metadata?.medias) {
            return ({
              id: msg.messageId,
              type: messageTypes.MULTIMEDIA,
              threadID,
              creatorID: getUserID(msg.senderFid),
              time: parseInt(msg.serverTimestamp, 10),
              media: msg?.metadata?.medias.map(
                med =>
                  ({
                    id: uuid.v4(),
                    uri: med.staticRaster,
                    type: 'photo',
                    thumbHash: null,
                    dimensions: {
                      height: med.height,
                      width: med.width,
                    },
                  }: Media),
              ),
            }: RawMessageInfo);
          }

          if (msg.type === 'text') {
            return ({
              id: msg.messageId,
              type: messageTypes.TEXT,
              threadID,
              creatorID: getUserID(msg.senderFid),
              time: parseInt(msg.serverTimestamp, 10),
              text: msg.message,
            }: RawMessageInfo);
          }

          return null;
        })
        .filter(Boolean);

      return {
        threadID,
        //TODO: not sure
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawMessageInfos,
      };
    })();
    void utils.dispatchActionPromise(
      fetchMessagesBeforeCursorActionTypes,
      promise,
    );
    await promise;
  },

  createPendingThread: (): RawThreadInfo => {
    throw new Error('createPendingThread method is not yet implemented');
  },

  couldBeCreatedFromPendingThread: (): boolean => {
    throw new Error(
      'couldBeCreatedFromPendingThread method is not yet implemented',
    );
  },

  canBeFrozen: (): boolean => {
    throw new Error('canBeFrozen method is not yet implemented');
  },

  pendingThreadType: (): ThreadType => {
    throw new Error('pendingThreadType method is not yet implemented');
  },

  createRealThreadFromPendingThread: async (): Promise<{
    +threadID: string,
    +threadType: ThreadType,
  }> => {
    throw new Error(
      'createRealThreadFromPendingThread method is not yet implemented',
    );
  },

  getRolePermissionBlobs: (): RolePermissionBlobs => {
    throw new Error('getRolePermissionBlobs method is not yet implemented');
  },

  deleteMessage: async (): Promise<void> => {
    throw new Error('deleteMessage method is not yet implemented');
  },

  joinThread: async (): Promise<ThreadJoinPayload> => {
    throw new Error('joinThread method is not yet implemented');
  },

  threadIDMatchesProtocol: (threadID: string): boolean => {
    return threadID.startsWith('farcaster');
  },

  allowsDeletingSidebarSource: false,

  presentationDetails: {
    membershipChangesShownInThreadPreview: false,
    usersWithoutDeviceListExcludedFromSearchResult: false,
    supportsMediaGallery: false,
    nativeChatThreadListIcon: 'farcaster',
    webChatThreadListIcon: 'server',
    threadAncestorLabel: ancestorPath => ancestorPath,
    threadSearchHeaderShowsGenesis: false,
  },

  uploadMultimediaMetadataToKeyserver: false,
  canActionsTargetPendingMessages: false,

  sidebarConfig: {
    // TODO: no sidebar?
    sidebarThreadType: thickThreadTypes.THICK_SIDEBAR,
    pendingSidebarURLPrefix: '/farcaster/sidebar/',
  },

  messagesStoredOnServer: false,
  arePendingThreadsDescendantsOfGenesis: false,
  threadActivityUpdatedByDMActivityHandler: false,
  membershipMessageNotifAction: messageNotifyTypes.NONE,
  shouldConvertIDs: false,
  dataIsBackedUp: true,
};

export { farcasterThreadProtocol };
