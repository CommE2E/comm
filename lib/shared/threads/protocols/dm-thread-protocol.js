// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { fetchMessagesBeforeCursorActionTypes } from '../../../actions/message-actions.js';
import { getThickThreadRolePermissionsBlob } from '../../../permissions/dm-permissions.js';
import type { TunnelbrokerSocketState } from '../../../tunnelbroker/tunnelbroker-context.js';
import type {
  CreateThickRawThreadInfoInput,
  DMChangeThreadReadStatusOperation,
  DMChangeThreadSettingsOperation,
  DMChangeThreadSubscriptionOperation,
  DMCreateEntryOperation,
  DMDeleteEntryOperation,
  DMEditEntryOperation,
  DMJoinThreadOperation,
  DMLeaveThreadOperation,
  DMSendDeleteMessageOperation,
  DMSendEditMessageOperation,
  DMSendReactionMessageOperation,
  DMThreadSettingsChanges,
} from '../../../types/dm-ops.js';
import { defaultNumberPerThread } from '../../../types/message-types.js';
import type {
  RoleInfo,
  ThreadCurrentUserInfo,
  ThickRawThreadInfo,
  MinimallyEncodedThickMemberInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import {
  minimallyEncodeMemberInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import { defaultThreadSubscription } from '../../../types/subscription-types.js';
import {
  assertThickThreadType,
  thickThreadTypes,
  threadTypes,
  type ThreadType,
} from '../../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientDBThreadInfo,
  ThickMemberInfo,
  ThreadJoinPayload,
} from '../../../types/thread-types.js';
import { threadTimestampsValidator } from '../../../types/thread-types.js';
import { dateString as stringFromDate } from '../../../utils/date-utils.js';
import { SendMessageError } from '../../../utils/errors.js';
import {
  assertWithValidator,
  pendingThickSidebarURLPrefix,
  thickIDRegExp,
} from '../../../utils/validation-utils.js';
import { generatePendingThreadColor } from '../../color-utils.js';
import {
  dmOperationSpecificationTypes,
  type OutboundDMOperationSpecification,
} from '../../dm-ops/dm-op-types.js';
import { getIDFromLocalID } from '../../id-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import {
  createThreadTimestamps,
  getContainingThreadID,
  threadIsPending,
  threadOtherMembers,
} from '../../thread-utils.js';
import type {
  ProtocolSendTextMessageInput,
  SendMultimediaMessageUtils,
  SendTextMessageUtils,
  ThreadProtocol,
  ProtocolSendMultimediaMessageInput,
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
  LeaveThreadUtils,
  ProtocolLeaveThreadInput,
  FetchMessageUtils,
  ProtocolFetchMessageInput,
  ProtocolCreatePendingThreadInput,
  CreateRealThreadParameters,
  DeleteMessageUtils,
  ProtocolDeleteMessageInput,
  JoinThreadUtils,
  ProtocolJoinThreadInput,
} from '../thread-spec.js';

const dmThreadProtocol: ThreadProtocol<MinimallyEncodedThickMemberInfo> =
  Object.freeze({
    sendTextMessage: async (
      message: ProtocolSendTextMessageInput,
      utils: SendTextMessageUtils,
    ) => {
      const { messageInfo, threadInfo, parentThreadInfo } = message;
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );

      const messageID = getIDFromLocalID(localID);
      const time = Date.now();

      const recipients =
        threadInfo.type === thickThreadTypes.THICK_SIDEBAR && parentThreadInfo
          ? parentThreadInfo.members
          : threadInfo.members;
      const recipientsIDs = recipients.map(recipient => recipient.id);

      const result = await utils.sendComposableDMOperation({
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

      await utils.sideEffectsFunction(
        messageInfo,
        threadInfo,
        parentThreadInfo,
      );

      return {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      };
    },

    sendMultimediaMessage: async (
      message: ProtocolSendMultimediaMessageInput,
      utils: SendMultimediaMessageUtils,
    ) => {
      const { messageInfo, threadInfo } = message;
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );

      const messageID = getIDFromLocalID(localID);
      const time = Date.now();

      const result = await utils.sendComposableDMOperation({
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

    editTextMessage: async (
      message: ProtocolEditTextMessageInput,
      utils: EditTextMessageUtils,
    ) => {
      const { viewerID, threadInfo, messageID, newText } = message;
      invariant(viewerID, 'viewerID should be set');
      const op: DMSendEditMessageOperation = {
        type: 'send_edit_message',
        threadID: threadInfo.id,
        creatorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        targetMessageID: messageID,
        text: newText,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };
      await utils.processAndSendDMOperation(opSpecification);
    },

    changeThreadSettings: async (
      protocolInput: ProtocolChangeThreadSettingsInput,
      utils: ChangeThreadSettingsUtils,
    ) => {
      const { viewerID, input } = protocolInput;
      invariant(viewerID, 'viewerID should be set');
      invariant(
        !input.changes.newMemberIDs,
        "DM protocol doesn't support" +
          ' adding new members when changing thread settings',
      );

      const changes: { ...DMThreadSettingsChanges } = {};
      if (input.changes.name) {
        changes.name = input.changes.name;
      }
      if (input.changes.description) {
        changes.description = input.changes.description;
      }
      if (input.changes.color) {
        changes.color = input.changes.color;
      }
      if (input.changes.avatar && input.changes.avatar.type === 'emoji') {
        changes.avatar = {
          type: 'emoji',
          emoji: input.changes.avatar.emoji,
          color: input.changes.avatar.color,
        };
      } else if (input.changes.avatar && input.changes.avatar.type === 'ens') {
        changes.avatar = { type: 'ens' };
      } else if (
        input.changes.avatar &&
        input.changes.avatar.type === 'non_keyserver_image'
      ) {
        changes.avatar = {
          type: 'encrypted_image',
          blobURI: input.changes.avatar.blobURI,
          thumbHash: input.changes.avatar.thumbHash,
          encryptionKey: input.changes.avatar.encryptionKey,
        };
      } else if (
        input.changes.avatar &&
        input.changes.avatar.type === 'remove'
      ) {
        changes.avatar = null;
      }

      const { threadInfo } = input;
      const op: DMChangeThreadSettingsOperation = {
        type: 'change_thread_settings',
        threadID: threadInfo.id,
        editorID: viewerID,
        time: Date.now(),
        changes,
        messageIDsPrefix: uuid.v4(),
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);
      return ({
        threadID: threadInfo.id,
        updatesResult: { newUpdates: [] },
        newMessageInfos: [],
      }: ChangeThreadSettingsPayload);
    },

    supportsCalendarHistory: false,

    calendarIsOnline: (tunnelbrokerSocketState: TunnelbrokerSocketState) =>
      !!tunnelbrokerSocketState.connected,

    createCalendarEntry: async (
      protocolInput: ProtocolCreateEntryInput,
      utils: CreateEntryUtils,
    ) => {
      const { viewerID, input } = protocolInput;

      invariant(viewerID, 'viewerID must be set');
      const entryID = uuid.v4();

      const { createEntryInfo, threadInfo } = input;
      const op: DMCreateEntryOperation = {
        type: 'create_entry',
        threadID: threadInfo.id,
        creatorID: viewerID,
        time: createEntryInfo.timestamp,
        entryID: uuid.v4(),
        entryDate: createEntryInfo.date,
        text: createEntryInfo.text,
        messageID: uuid.v4(),
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);

      return {
        entryID,
        newMessageInfos: [],
        threadID: createEntryInfo.threadID,
        localID: createEntryInfo.localID,
        updatesResult: {
          viewerUpdates: [],
          userInfos: [],
        },
      };
    },

    deleteCalendarEntry: async (
      protocolInput: ProtocolDeleteEntryInput,
      utils: DeleteEntryUtils,
    ) => {
      const { viewerID, input, originalEntry: prevEntry } = protocolInput;
      const { deleteEntryInfo, threadInfo } = input;

      invariant(viewerID, 'viewerID must be set');

      const op: DMDeleteEntryOperation = {
        type: 'delete_entry',
        threadID: threadInfo.id,
        creatorID: viewerID,
        creationTime: prevEntry.creationTime,
        time: Date.now(),
        entryID: deleteEntryInfo.entryID,
        entryDate: stringFromDate(
          prevEntry.year,
          prevEntry.month,
          prevEntry.day,
        ),
        prevText: deleteEntryInfo.prevText,
        messageID: uuid.v4(),
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);

      return {
        threadID: threadInfo.id,
        newMessageInfos: [],
        updatesResult: {
          viewerUpdates: [],
          userInfos: [],
        },
      };
    },

    editCalendarEntry: async (
      protocolInput: ProtocolEditEntryInput,
      utils: EditEntryUtils,
    ) => {
      const { viewerID, input, originalEntry: prevEntry } = protocolInput;
      const { saveEntryInfo, threadInfo } = input;

      invariant(viewerID, 'viewerID must be set');

      const op: DMEditEntryOperation = {
        type: 'edit_entry',
        threadID: threadInfo.id,
        creatorID: viewerID,
        creationTime: prevEntry.creationTime,
        time: saveEntryInfo.timestamp,
        entryID: saveEntryInfo.entryID,
        entryDate: stringFromDate(
          prevEntry.year,
          prevEntry.month,
          prevEntry.day,
        ),
        text: saveEntryInfo.text,
        messageID: uuid.v4(),
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);

      return {
        entryID: saveEntryInfo.entryID,
        newMessageInfos: [],
        updatesResult: {
          viewerUpdates: [],
          userInfos: [],
        },
      };
    },

    setThreadUnreadStatus: async (
      input: ProtocolSetThreadUnreadStatusInput,
      utils: SetThreadUnreadStatusUtils,
    ) => {
      const {
        viewerID,
        input: { threadInfo },
      } = input;

      invariant(viewerID, 'viewerID must be set');
      const op: DMChangeThreadReadStatusOperation = {
        type: 'change_thread_read_status',
        time: Date.now(),
        threadID: threadInfo.id,
        creatorID: viewerID,
        unread: !threadInfo.currentUser.unread,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'self_devices',
        },
      };

      await utils.processAndSendDMOperation(opSpecification);
      return {
        resetToUnread: false,
        threadID: threadInfo.id,
      };
    },

    sendReaction: async (
      input: ProtocolSendReactionInput,
      utils: SendReactionUtils,
    ) => {
      const { threadInfo, viewerID, messageID, reaction, action } = input;
      const threadID = threadInfo.id;

      const op: DMSendReactionMessageOperation = {
        type: 'send_reaction_message',
        threadID,
        creatorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        targetMessageID: messageID,
        reaction,
        action,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };
      await utils.processAndSendDMOperation(opSpecification);
    },

    addThreadMembers: (
      input: ProtocolAddThreadMembersInput,
      utils: AddThreadMembersUtils,
    ) => utils.dmAddThreadMembers(input.newMemberIDs, input.threadInfo),

    updateSubscription: async (
      protocolInput: ProtocolUpdateSubscriptionInput,
      utils: UpdateSubscriptionUtils,
    ) => {
      const { viewerID, input } = protocolInput;
      invariant(viewerID, 'viewerID must be set');

      const { threadInfo, updatedFields } = input;
      const subscription = {
        ...threadInfo.currentUser.subscription,
        ...updatedFields,
      };

      const op: DMChangeThreadSubscriptionOperation = {
        type: 'change_thread_subscription',
        time: Date.now(),
        threadID: threadInfo.id,
        creatorID: viewerID,
        subscription,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);
      return { threadID: threadInfo.id, subscription };
    },

    leaveThread: async (
      input: ProtocolLeaveThreadInput,
      utils: LeaveThreadUtils,
    ) => {
      const { threadInfo, viewerID } = input;
      invariant(viewerID, 'viewerID should be set');
      const op: DMLeaveThreadOperation = {
        type: 'leave_thread',
        editorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        threadID: threadInfo.id,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };
      await utils.processAndSendDMOperation(opSpecification);
      return {
        invalidatedThreads: [],
      };
    },

    convertClientDBThreadInfo: (
      clientDBThreadInfo: ClientDBThreadInfo,
      members: $ReadOnlyArray<MinimallyEncodedThickMemberInfo>,
      roles: { +[id: string]: RoleInfo },
      currentUser: ThreadCurrentUserInfo,
    ) => {
      const thickThreadType = assertThickThreadType(clientDBThreadInfo.type);

      invariant(
        clientDBThreadInfo.timestamps,
        'Thick thread info must contain the timestamps',
      );
      const threadTimestamps = assertWithValidator(
        JSON.parse(clientDBThreadInfo.timestamps),
        threadTimestampsValidator,
      );

      let rawThreadInfo: ThickRawThreadInfo = {
        minimallyEncoded: true,
        thick: true,
        id: clientDBThreadInfo.id,
        type: thickThreadType,
        name: clientDBThreadInfo.name,
        description: clientDBThreadInfo.description,
        color: clientDBThreadInfo.color,
        creationTime: Number(clientDBThreadInfo.creationTime),
        parentThreadID: clientDBThreadInfo.parentThreadID,
        containingThreadID: clientDBThreadInfo.containingThreadID,
        members,
        roles,
        currentUser,
        repliesCount: clientDBThreadInfo.repliesCount,
        pinnedCount: clientDBThreadInfo.pinnedCount,
        timestamps: threadTimestamps,
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
      const { threadID, numMessagesToFetch, currentNumberOfFetchedMessages } =
        input;
      const promise = (async () => {
        return await utils.fetchMessagesFromDB(
          threadID,
          numMessagesToFetch ?? defaultNumberPerThread,
          currentNumberOfFetchedMessages,
        );
      })();
      void utils.dispatchActionPromise(
        fetchMessagesBeforeCursorActionTypes,
        promise,
      );
      await promise;
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
      const thickThreadType = assertThickThreadType(threadType);
      return {
        minimallyEncoded: true,
        thick: true,
        id: threadID,
        type: thickThreadType,
        name: name ?? null,
        description: null,
        color: threadColor ?? generatePendingThreadColor(memberIDs),
        creationTime,
        parentThreadID: parentThreadInfo?.id ?? null,
        containingThreadID: getContainingThreadID(
          parentThreadInfo,
          thickThreadType,
        ),
        members: members.map(member =>
          minimallyEncodeMemberInfo<ThickMemberInfo>({
            id: member.id,
            role: role.id,
            permissions: membershipPermissions,
            isSender: false,
            subscription: defaultThreadSubscription,
          }),
        ),
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
        timestamps: createThreadTimestamps(creationTime, memberIDs),
      };
    },

    couldBeCreatedFromPendingThread: () => true,

    canBeFrozen: () => true,

    pendingThreadType,

    createRealThreadFromPendingThread: async (
      params: CreateRealThreadParameters,
    ) => {
      const { threadInfo, viewerID, sourceMessageID, createNewThickThread } =
        params;
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

      if (threadInfo.type === threadTypes.THICK_SIDEBAR) {
        invariant(
          sourceMessageID,
          'sourceMessageID should be set when creating a sidebar',
        );
        invariant(
          threadInfo.parentThreadID,
          'parentThreadID should be set when creating a sidebar',
        );
        const newThreadID = await createNewThickThread({
          type: threadTypes.THICK_SIDEBAR,
          initialMemberIDs: otherMemberIDs,
          color: threadInfo.color,
          sourceMessageID,
          parentThreadID: threadInfo.parentThreadID,
          name: threadInfo.name,
        });
        return {
          threadID: newThreadID,
          threadType: threadTypes.THICK_SIDEBAR,
        };
      }

      const type = pendingThreadType(otherMemberIDs.length);

      const newThreadID = await createNewThickThread({
        type,
        initialMemberIDs: otherMemberIDs,
        color: threadInfo.color,
      });

      return {
        threadID: newThreadID,
        threadType: type,
      };
    },

    getRolePermissionBlobs: (threadType: ThreadType) => {
      const thickThreadType = assertThickThreadType(threadType);
      const memberPermissions =
        getThickThreadRolePermissionsBlob(thickThreadType);
      return {
        Members: memberPermissions,
      };
    },

    deleteMessage: async (
      input: ProtocolDeleteMessageInput,
      utils: DeleteMessageUtils,
    ) => {
      const { messageID, threadInfo, viewerID } = input;
      invariant(viewerID, 'viewerID should be set');
      const op: DMSendDeleteMessageOperation = {
        type: 'send_delete_message',
        threadID: threadInfo.id,
        creatorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        targetMessageID: messageID,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };
      await utils.processAndSendDMOperation(opSpecification);
    },

    joinThread: async (
      input: ProtocolJoinThreadInput,
      utils: JoinThreadUtils,
    ) => {
      const { viewerID, rawThreadInfo } = input;

      invariant(viewerID, 'viewerID should be set');
      invariant(rawThreadInfo && rawThreadInfo.thick, 'thread must be thick');

      const existingThreadDetails =
        getCreateThickRawThreadInfoInputFromThreadInfo(rawThreadInfo);

      const op: DMJoinThreadOperation = {
        type: 'join_thread',
        joinerID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        existingThreadDetails,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            rawThreadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            rawThreadInfo.parentThreadID
              ? rawThreadInfo.parentThreadID
              : rawThreadInfo.id,
        },
      };

      await utils.processAndSendDMOperation(opSpecification);
      return ({
        updatesResult: { newUpdates: [] },
        rawMessageInfos: [],
        truncationStatuses: {},
        userInfos: [],
      }: ThreadJoinPayload);
    },

    threadIDMatchesProtocol: (threadID: string) => thickIDRegExp.test(threadID),

    allowsDeletingSidebarSource: false,

    presentationDetails: {
      membershipChangesShownInThreadPreview: true,
      usersWithoutDeviceListExcludedFromSearchResult: true,
      supportsMediaGallery: false,
      nativeChatThreadListIcon: 'lock',
      webChatThreadListIcon: 'lock',
      threadAncestorLabel: () => 'Local DM',
      threadSearchHeaderShowsGenesis: false,
    },

    uploadMultimediaMetadataToKeyserver: false,

    canActionsTargetPendingMessages: true,

    sidebarConfig: {
      sidebarThreadType: thickThreadTypes.THICK_SIDEBAR,
      pendingSidebarURLPrefix: pendingThickSidebarURLPrefix,
    },

    messagesStoredOnServer: false,

    arePendingThreadsDescendantsOfGenesis: false,

    threadActivityUpdatedActivityHandlerOnly: true,

    membershipMessageNotifAction: messageNotifyTypes.SET_UNREAD,

    shouldConvertIDs: false,

    dataIsBackedUp: true,
    supportedThreadSettings: {
      avatar: true,
      name: true,
      description: true,
      color: true,
    },
    supportsBackgroundNotifs: true,
  });

function pendingThreadType(numberOfOtherMembers: number) {
  if (numberOfOtherMembers === 0) {
    return threadTypes.PRIVATE;
  } else if (numberOfOtherMembers === 1) {
    return threadTypes.PERSONAL;
  } else {
    return threadTypes.LOCAL;
  }
}

function getCreateThickRawThreadInfoInputFromThreadInfo(
  threadInfo: ThickRawThreadInfo,
): CreateThickRawThreadInfoInput {
  const roleID = Object.keys(threadInfo.roles).pop();
  invariant(roleID, 'roleID must be set');
  const thickThreadType = assertThickThreadType(threadInfo.type);
  return {
    threadID: threadInfo.id,
    threadType: thickThreadType,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    allMemberIDsWithSubscriptions: threadInfo.members.map(
      ({ id, subscription }) => ({
        id,
        subscription,
      }),
    ),
    roleID,
    unread: !!threadInfo.currentUser.unread,
    name: threadInfo.name,
    avatar: threadInfo.avatar,
    description: threadInfo.description,
    color: threadInfo.color,
    containingThreadID: threadInfo.containingThreadID,
    sourceMessageID: threadInfo.sourceMessageID,
    repliesCount: threadInfo.repliesCount,
    pinnedCount: threadInfo.pinnedCount,
    timestamps: threadInfo.timestamps,
  };
}

export { dmThreadProtocol, getCreateThickRawThreadInfoInputFromThreadInfo };
