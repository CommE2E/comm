// @flow

import invariant from 'invariant';

import { fetchMessagesBeforeCursorActionTypes } from '../../../actions/message-actions.js';
import { getFarcasterRolePermissionsBlobs } from '../../../permissions/farcaster-permissions.js';
import type { RolePermissionBlobs } from '../../../permissions/thread-permissions.js';
import type { SetThreadUnreadStatusPayload } from '../../../types/activity-types.js';
import type {
  CreateEntryPayload,
  DeleteEntryResult,
  SaveEntryResult,
} from '../../../types/entry-types.js';
import {
  defaultNumberPerThread,
  type SendMessagePayload,
  type SendMultimediaMessagePayload,
} from '../../../types/message-types.js';
import type {
  FarcasterRawThreadInfo,
  MemberInfoSansPermissions,
  RawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
  ThreadInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import type { SubscriptionUpdateResult } from '../../../types/subscription-types.js';
import type { ThreadType } from '../../../types/thread-types-enum.js';
import {
  assertFarcasterThreadType,
  farcasterThreadTypes,
} from '../../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientDBThreadInfo,
  ThreadJoinPayload,
} from '../../../types/thread-types.js';
import { updateTypes } from '../../../types/update-types-enum.js';
import { type ThreadUpdateInfo } from '../../../types/update-types.js';
import { extractFarcasterIDsFromPayload } from '../../../utils/conversion-utils.js';
import { convertFarcasterMessageToCommMessages } from '../../../utils/convert-farcaster-message-to-comm-messages.js';
import { createFarcasterRawThreadInfo } from '../../../utils/create-farcaster-raw-thread-info.js';
import { farcasterThreadIDRegExp } from '../../../utils/validation-utils.js';
import { farcasterMessageValidator } from '../../farcaster/farcaster-messages-types.js';
import {
  conversationIDFromFarcasterThreadID,
  userIDFromFID,
} from '../../id-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import { getSingleOtherUser } from '../../thread-utils.js';
import type {
  ChangeThreadSettingsUtils,
  ProtocolChangeThreadSettingsInput,
  FetchMessageUtils,
  ProtocolFetchMessageInput,
  ProtocolSendTextMessageInput,
  ProtocolSetThreadUnreadStatusInput,
  ProtocolUpdateSubscriptionInput,
  SendTextMessageUtils,
  SetThreadUnreadStatusUtils,
  ThreadProtocol,
  OnOpenThreadUtils,
  ProtocolOnOpenThreadInput,
  UpdateSubscriptionUtils,
} from '../thread-spec.js';

const farcasterThreadProtocol: ThreadProtocol<MemberInfoSansPermissions> = {
  sendTextMessage: async (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ): Promise<SendMessagePayload> => {
    const { sendFarcasterTextMessage, currentUserFID } = utils;
    const { messageInfo, threadInfo } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const time = Date.now();

    let request;
    if (threadInfo.type === farcasterThreadTypes.FARCASTER_PERSONAL) {
      const otherUser = getSingleOtherUser(threadInfo, currentUserFID);
      invariant(
        otherUser,
        `Farcaster 1:1 conversation should have one more member except ${
          currentUserFID ?? 'null'
        }`,
      );
      request = {
        recipientFid: otherUser,
        message: messageInfo.text,
      };
    } else {
      const conversationID = conversationIDFromFarcasterThreadID(threadInfo.id);
      request = {
        groupId: conversationID,
        message: messageInfo.text,
      };
    }

    const result = await sendFarcasterTextMessage(request);

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

  changeThreadSettings: async (
    protocolInput: ProtocolChangeThreadSettingsInput,
    utils: ChangeThreadSettingsUtils,
  ) => {
    const {
      input: { changes, threadInfo },
    } = protocolInput;
    const {
      updateFarcasterGroupNameAndDescription,
      fetchFarcasterConversation,
      fetchFarcasterMessages,
      fetchUsersByFIDs,
      dispatch,
    } = utils;
    invariant(
      !changes.color,
      "Farcaster protocol doesn't support changing color",
    );
    invariant(
      !changes.type,
      "Farcaster protocol doesn't support changing thread type",
    );
    invariant(
      !changes.parentThreadID,
      "Farcaster protocol doesn't support changing parent thread type",
    );

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    const promises = [];
    if (changes.name || changes.description) {
      promises.push(
        updateFarcasterGroupNameAndDescription({
          conversationId,
          // Name is mandatory in the API, because of that input contains
          // the updated name or the previous one.
          name: changes.name ?? threadInfo.name ?? '',
          description: changes.description,
        }),
      );
    }
    if (changes.newMemberIDs) {
      throw new Error('newMemberIDs not implemented yet');
    }
    if (changes.avatar) {
      throw new Error('avatar not implemented yet');
    }

    // Perform all updates before fetching updated thread
    await Promise.all(promises);

    const updatedConversation = await fetchFarcasterConversation({
      conversationId,
    });

    const update = ({
      type: updateTypes.UPDATE_THREAD,
      id: threadInfo.id,
      time: Date.now(),
      threadInfo: createFarcasterRawThreadInfo(
        updatedConversation.result.conversation,
      ),
    }: ThreadUpdateInfo);

    const messagesResponse = await fetchFarcasterMessages({
      conversationId,
    });
    const farcasterMessages = messagesResponse.result.messages;
    const userFIDs = farcasterMessages.flatMap(message =>
      extractFarcasterIDsFromPayload(farcasterMessageValidator, message),
    );

    const fcUserInfos = await fetchUsersByFIDs(userFIDs);

    const newMessageInfos = farcasterMessages.flatMap(farcasterMessage =>
      convertFarcasterMessageToCommMessages(farcasterMessage, fcUserInfos),
    );

    if (fcUserInfos.size > 0) {
      const newUserIDs = Array.from(fcUserInfos.entries()).map(
        ([fid, user]) => user?.userID ?? userIDFromFID(fid),
      );
      dispatch({
        // TODO: importing processNewUserIDsActionType causes circular
        // dependencies that are hard to resolve
        type: 'PROCESS_NEW_USER_IDS',
        payload: { userIDs: newUserIDs },
      });
    }

    return ({
      threadID: threadInfo.id,
      updatesResult: { newUpdates: [update] },
      newMessageInfos,
    }: ChangeThreadSettingsPayload);
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

  setThreadUnreadStatus: async (
    protocolInput: ProtocolSetThreadUnreadStatusInput,
    utils: SetThreadUnreadStatusUtils,
  ): Promise<SetThreadUnreadStatusPayload> => {
    const { input } = protocolInput;
    const { threadInfo, unread } = input;
    const { streamFarcasterDirectCastRead, markFarcasterDirectCastUnread } =
      utils;

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    if (unread) {
      await markFarcasterDirectCastUnread({ conversationId });
    } else {
      await streamFarcasterDirectCastRead({ conversationId });
    }

    return {
      threadID: threadInfo.id,
      resetToUnread: false,
    };
  },

  sendReaction: async (): Promise<mixed> => {
    throw new Error('sendReaction method is not yet implemented');
  },

  addThreadMembers: async (): Promise<void> => {
    throw new Error('addThreadMembers method is not yet implemented');
  },

  updateSubscription: async (
    protocolInput: ProtocolUpdateSubscriptionInput,
    utils: UpdateSubscriptionUtils,
  ): Promise<SubscriptionUpdateResult> => {
    const { input } = protocolInput;
    const { threadInfo, updatedFields } = input;
    const { home, pushNotifs } = updatedFields;
    const { updateFarcasterSubscription } = utils;

    invariant(
      home === pushNotifs,
      'background notifs are not supported for Farcaster',
    );

    const muted = !home && !pushNotifs;
    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    await updateFarcasterSubscription({ conversationId, muted });

    return {
      threadID: threadInfo.id,
      subscription: {
        ...threadInfo.currentUser.subscription,
        ...updatedFields,
      },
    };
  },

  leaveThread: async () => {
    throw new Error('leaveThread method is not yet implemented');
  },

  convertClientDBThreadInfo: (
    clientDBThreadInfo: ClientDBThreadInfo,
    members: $ReadOnlyArray<MemberInfoSansPermissions>,
    roles: { +[id: string]: RoleInfo },
    currentUser: ThreadCurrentUserInfo,
  ) => {
    const farcasterThreadType = assertFarcasterThreadType(
      clientDBThreadInfo.type,
    );

    let rawThreadInfo: FarcasterRawThreadInfo = {
      farcaster: true,
      id: clientDBThreadInfo.id,
      type: farcasterThreadType,
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
      minimallyEncoded: true,
    };

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

  createPendingThread: (): RawThreadInfo => {
    throw new Error('createPendingThread method is not yet implemented');
  },

  couldBeCreatedFromPendingThread: () => true,

  canBeFrozen: (thread: ThreadInfo) => {
    return thread.type === farcasterThreadTypes.FARCASTER_PERSONAL;
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

  getRolePermissionBlobs: (threadType: ThreadType): RolePermissionBlobs => {
    const farcasterThreadType = assertFarcasterThreadType(threadType);
    return getFarcasterRolePermissionsBlobs(farcasterThreadType);
  },

  deleteMessage: async (): Promise<void> => {
    throw new Error('deleteMessage method is not yet implemented');
  },

  joinThread: async (): Promise<ThreadJoinPayload> => {
    throw new Error('joinThread method is not yet implemented');
  },

  onOpenThread: (
    input: ProtocolOnOpenThreadInput,
    utils: OnOpenThreadUtils,
  ) => {
    const conversationID = conversationIDFromFarcasterThreadID(input.threadID);
    void utils.farcasterRefreshConversation(conversationID);
  },

  threadIDMatchesProtocol: (threadID: string): boolean => {
    return farcasterThreadIDRegExp.test(threadID);
  },

  allowsDeletingSidebarSource: false,

  presentationDetails: {
    membershipChangesShownInThreadPreview: false,
    usersWithoutDeviceListExcludedFromSearchResult: false,
    supportsMediaGallery: false,
    nativeChatThreadListIcon: 'lock',
    webChatThreadListIcon: 'lock',
    threadAncestorLabel: () => 'Farcaster DC',
    threadSearchHeaderShowsGenesis: false,
  },

  uploadMultimediaMetadataToKeyserver: false,
  canActionsTargetPendingMessages: false,
  messagesStoredOnServer: false,
  arePendingThreadsDescendantsOfGenesis: false,
  threadActivityUpdatedByActivityHandlerOnly: false,
  alwaysUpdateThreadActivity: true,
  membershipMessageNotifAction: messageNotifyTypes.NONE,
  shouldConvertIDs: false,
  dataIsBackedUp: true,

  supportedThreadSettings: {
    avatar: true,
    name: true,
    description: true,
    // Farcaster threads do not support color changes
    color: false,
  },
  supportsBackgroundNotifs: false,
};

export { farcasterThreadProtocol };
