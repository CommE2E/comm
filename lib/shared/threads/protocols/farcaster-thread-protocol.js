// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import {
  changeThreadMemberRolesActionTypes,
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from '../../../actions/thread-action-types.js';
import type { LeaveThreadResult } from '../../../hooks/thread-hooks.js';
import { getFarcasterRolePermissionsBlobs } from '../../../permissions/farcaster-permissions.js';
import type { RolePermissionBlobs } from '../../../permissions/thread-permissions.js';
import type { SetThreadUnreadStatusPayload } from '../../../types/activity-types.js';
import type { AuxUserStore } from '../../../types/aux-user-types.js';
import type {
  CreateEntryPayload,
  DeleteEntryResult,
  SaveEntryResult,
} from '../../../types/entry-types.js';
import { messageTypes } from '../../../types/message-types-enum.js';
import {
  defaultNumberPerThread,
  messageTruncationStatus,
  type SendMessagePayload,
  type SendMultimediaMessagePayload,
} from '../../../types/message-types.js';
import type { CompoundReactionInfo } from '../../../types/messages/compound-reaction.js';
import type {
  FarcasterRawThreadInfo,
  MemberInfoSansPermissions,
  RawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
  ThreadInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import { minimallyEncodeThreadCurrentUserInfo } from '../../../types/minimally-encoded-thread-permissions-types.js';
import type { SubscriptionUpdateResult } from '../../../types/subscription-types.js';
import { defaultThreadSubscription } from '../../../types/subscription-types.js';
import type { ThreadType } from '../../../types/thread-types-enum.js';
import {
  assertFarcasterThreadType,
  farcasterThreadTypes,
  threadTypes,
} from '../../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientDBThreadInfo,
  RawThreadInfos,
  ThreadJoinPayload,
} from '../../../types/thread-types.js';
import { updateTypes } from '../../../types/update-types-enum.js';
import { messageIDToCompoundReactionID } from '../../../utils/convert-farcaster-message-to-comm-messages.js';
import { createFarcasterRawThreadInfoPersonal } from '../../../utils/create-farcaster-raw-thread-info.js';
import { farcasterThreadIDRegExp } from '../../../utils/validation-utils.js';
import { generatePendingThreadColor } from '../../color-utils.js';
import { processFarcasterOpsActionType } from '../../farcaster/farcaster-actions.js';
import type {
  ModifyFarcasterMembershipInput,
  SendReactionInput,
  SendFarcasterMessageResult,
  SendFarcasterTextMessageInput,
} from '../../farcaster/farcaster-api.js';
import type { FarcasterConversation } from '../../farcaster/farcaster-conversation-types.js';
import {
  conversationIDFromFarcasterThreadID,
  farcasterPersonalConversationID,
  farcasterThreadIDFromConversationID,
  getFIDFromUserID,
} from '../../id-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import { protocolNames } from '../../protocol-names.js';
import {
  getContainingThreadID,
  getSingleOtherUser,
  threadIsPending,
  threadOtherMembers,
  roleIsAdminRole,
} from '../../thread-utils.js';
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
  ProtocolCreatePendingThreadInput,
  CreateRealThreadParameters,
  ProtocolAddThreadMembersInput,
  AddThreadMembersUtils,
  ProtocolChangeThreadMemberRolesInput,
  ChangeThreadMemberRolesUtils,
  ProtocolRemoveUsersFromThreadInput,
  RemoveUsersFromThreadUtils,
  ProtocolLeaveThreadInput,
  LeaveThreadUtils,
  ProtocolSendMultimediaMessageInput,
  SendMultimediaMessageUtils,
  ProtocolSendReactionInput,
  SendReactionUtils,
  JoinThreadUtils,
  ProtocolJoinThreadInput,
} from '../thread-spec.js';
import { threadTypeIsPersonal } from '../thread-specs.js';

async function sendFarcasterMessage({
  threadInfo,
  viewerID,
  auxUserStore,
  text,
  sendFarcasterTextMessage,
  rawThreadInfos,
  farcasterFetchConversation,
  threadCreation,
}: {
  threadInfo: ThreadInfo | RawThreadInfo,
  viewerID: string,
  auxUserStore: AuxUserStore,
  text: string,
  sendFarcasterTextMessage: SendFarcasterTextMessageInput => Promise<SendFarcasterMessageResult>,
  rawThreadInfos: RawThreadInfos,
  farcasterFetchConversation: (
    conversationID: string,
  ) => Promise<?FarcasterConversation>,
  threadCreation: boolean,
}) {
  const time = Date.now();

  let request;
  if (threadInfo.type === farcasterThreadTypes.FARCASTER_PERSONAL) {
    const otherUser = getSingleOtherUser(threadInfo, viewerID);
    invariant(
      otherUser,
      `Farcaster 1:1 conversation should have one more member except ${
        viewerID ?? 'null'
      }`,
    );
    const targetFID = getFIDFromUserID(otherUser, auxUserStore.auxUserInfos);

    if (!targetFID) {
      throw new Error('Missing target fid');
    }

    const recipientFID = parseInt(targetFID, 10);
    request = {
      recipientFid: recipientFID,
      message: text,
    };
  } else {
    const conversationID = conversationIDFromFarcasterThreadID(threadInfo.id);
    request = {
      groupId: conversationID,
      message: text,
    };
  }

  const result = await sendFarcasterTextMessage(request);

  if (
    threadInfo.type === farcasterThreadTypes.FARCASTER_PERSONAL &&
    (!rawThreadInfos[threadInfo.id] || threadCreation)
  ) {
    await farcasterFetchConversation(
      conversationIDFromFarcasterThreadID(threadInfo.id),
    );
  }
  return { time, result };
}

const farcasterThreadProtocol: ThreadProtocol<MemberInfoSansPermissions> = {
  sendTextMessage: async (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ): Promise<SendMessagePayload> => {
    const {
      sendFarcasterTextMessage,
      viewerID,
      auxUserStore,
      farcasterFetchConversation,
      rawThreadInfos,
    } = utils;
    const { messageInfo, threadInfo, threadCreation } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const { time, result } = await sendFarcasterMessage({
      threadInfo,
      viewerID,
      auxUserStore,
      text: messageInfo.text,
      sendFarcasterTextMessage,
      rawThreadInfos,
      farcasterFetchConversation,
      threadCreation,
    });

    return {
      localID,
      serverID: result.result.messageId,
      threadID: threadInfo.id,
      time: time,
    };
  },

  sendMultimediaMessage: async (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ): Promise<SendMultimediaMessagePayload> => {
    const { messageInfo, threadInfo, threadCreation } = message;
    const {
      sendFarcasterTextMessage,
      viewerID,
      auxUserStore,
      farcasterFetchConversation,
      rawThreadInfos,
    } = utils;
    const { localID, media } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const messageText = media
      .map(m => {
        if (m.type === 'photo' || m.type === 'video') {
          return m.uri;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    const { time, result } = await sendFarcasterMessage({
      threadInfo,
      viewerID,
      auxUserStore,
      text: messageText,
      sendFarcasterTextMessage,
      rawThreadInfos,
      farcasterFetchConversation,
      threadCreation,
    });

    return {
      result: {
        localID,
        serverID: result.result.messageId,
        threadID: messageInfo.threadID,
        time,
      },
    };
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
      modifyFarcasterMembership,
      refreshFarcasterConversation,
      auxUserStore,
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
      const targetFIDs = changes.newMemberIDs
        .map(memberID => {
          const targetFID = getFIDFromUserID(
            memberID,
            auxUserStore.auxUserInfos,
          );
          return targetFID ? parseInt(targetFID, 10) : null;
        })
        .filter(Boolean);

      if (targetFIDs.length > 0) {
        const modifyFarcasterMembershipInput: ModifyFarcasterMembershipInput = {
          conversationId,
          action: 'add',
          targetFids: targetFIDs,
        };

        promises.push(
          modifyFarcasterMembership(modifyFarcasterMembershipInput),
        );
      }
    }
    if (changes.avatar) {
      throw new Error('avatar not implemented yet');
    }

    // Perform all updates before refreshing conversation
    await Promise.all(promises);

    await refreshFarcasterConversation(conversationId);

    return ({
      threadID: threadInfo.id,
      updatesResult: { newUpdates: [] },
      newMessageInfos: [],
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

  sendReaction: async (
    input: ProtocolSendReactionInput,
    utils: SendReactionUtils,
  ) => {
    const { threadInfo, reaction, action, messageInfo } = input;
    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);
    const messageID = messageInfo.id;
    if (!messageID) {
      return;
    }

    const reactionsMessageID = messageIDToCompoundReactionID(messageID);
    const currentReactionsMessage =
      await utils.fetchMessage(reactionsMessageID);
    const reactionCountChange = action === 'add_reaction' ? 1 : -1;
    let currentCount = 0;
    if (
      currentReactionsMessage &&
      currentReactionsMessage.type === messageTypes.COMPOUND_REACTION
    ) {
      currentCount = currentReactionsMessage.reactions[reaction]?.count ?? 0;
    }

    const newCount = currentCount + reactionCountChange;
    const updatedReaction = {
      count: currentCount + reactionCountChange,
      viewerReacted: action === 'add_reaction',
    };
    const { [reaction]: oldReaction, ...rest } =
      (currentReactionsMessage?.reactions ?? {}: {
        +[reaction: string]: CompoundReactionInfo,
      });
    let updatedReactions = rest;
    if (newCount > 0) {
      updatedReactions = {
        ...currentReactionsMessage?.reactions,
        [reaction]: updatedReaction,
      };
    }

    const updatedMessage = {
      id: reactionsMessageID,
      type: messageTypes.COMPOUND_REACTION,
      threadID: threadInfo.id,
      creatorID: messageInfo.creator.id,
      time: messageInfo.time + 1,
      targetMessageID: messageID,
      reactions: updatedReactions,
    };
    utils.dispatch({
      type: processFarcasterOpsActionType,
      payload: { rawMessageInfos: [updatedMessage], updateInfos: [] },
    });

    const payload: SendReactionInput = {
      conversationId,
      messageId: messageID,
      reaction,
      action,
    };
    const { farcasterSendReaction } = utils;
    await farcasterSendReaction(payload);
  },

  addThreadMembers: async (
    input: ProtocolAddThreadMembersInput,
    utils: AddThreadMembersUtils,
  ): Promise<void> => {
    const { threadInfo, newMemberIDs } = input;
    const {
      modifyFarcasterMembership,
      refreshFarcasterConversation,
      dispatchActionPromise,
      auxUserStore,
    } = utils;

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    const promise = (async () => {
      const targetFIDs = newMemberIDs
        .map(memberID => {
          const targetFID = getFIDFromUserID(
            memberID,
            auxUserStore.auxUserInfos,
          );
          return targetFID ? parseInt(targetFID, 10) : null;
        })
        .filter(Boolean);

      if (targetFIDs.length > 0) {
        const modifyFarcasterMembershipInput: ModifyFarcasterMembershipInput = {
          conversationId,
          action: 'add',
          targetFids: targetFIDs,
        };

        await modifyFarcasterMembership(modifyFarcasterMembershipInput);
        await refreshFarcasterConversation(conversationId);
      }
    })();

    void dispatchActionPromise(changeThreadSettingsActionTypes, promise);

    await promise;
  },

  changeThreadMemberRoles: async (
    input: ProtocolChangeThreadMemberRolesInput,
    utils: ChangeThreadMemberRolesUtils,
  ): Promise<ChangeThreadSettingsPayload> => {
    const { threadInfo, memberIDs, newRole } = input;
    const {
      modifyFarcasterMembership,
      fetchConversation,
      dispatchActionPromise,
      auxUserStore,
    } = utils;

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    // Determine if we're promoting or demoting based on role
    const isPromoting = roleIsAdminRole(threadInfo.roles[newRole]);

    const promise = (async () => {
      const membershipPromises = memberIDs
        .map(memberID => {
          const targetFID = getFIDFromUserID(
            memberID,
            auxUserStore.auxUserInfos,
          );
          if (targetFID) {
            let modifyFarcasterMembershipInput: ModifyFarcasterMembershipInput =
              {
                conversationId,
                action: 'demote',
                targetFid: parseInt(targetFID, 10),
              };

            if (isPromoting) {
              modifyFarcasterMembershipInput = {
                conversationId,
                action: 'promote',
                targetFid: parseInt(targetFID, 10),
              };
            }

            return modifyFarcasterMembership(modifyFarcasterMembershipInput);
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(membershipPromises);

      await fetchConversation(conversationId);

      return {
        threadID: threadInfo.id,
        updatesResult: { newUpdates: [] },
        newMessageInfos: [],
      };
    })();

    void dispatchActionPromise(changeThreadMemberRolesActionTypes, promise);

    return await promise;
  },

  removeUsersFromThread: async (
    input: ProtocolRemoveUsersFromThreadInput,
    utils: RemoveUsersFromThreadUtils,
  ): Promise<ChangeThreadSettingsPayload> => {
    const { threadInfo, memberIDs, customKeyName } = input;
    const {
      modifyFarcasterMembership,
      fetchConversation,
      dispatchActionPromise,
      auxUserStore,
    } = utils;

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    const promise = (async () => {
      const membershipPromises = memberIDs
        .map(memberID => {
          const targetFID = getFIDFromUserID(
            memberID,
            auxUserStore.auxUserInfos,
          );
          if (targetFID) {
            const modifyFarcasterMembershipInput: ModifyFarcasterMembershipInput =
              {
                conversationId,
                action: 'remove',
                targetFid: parseInt(targetFID, 10),
              };

            return modifyFarcasterMembership(modifyFarcasterMembershipInput);
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(membershipPromises);

      await fetchConversation(conversationId);

      return {
        threadID: threadInfo.id,
        updatesResult: { newUpdates: [] },
        newMessageInfos: [],
      };
    })();

    void dispatchActionPromise(
      removeUsersFromThreadActionTypes,
      promise,
      customKeyName ? { customKeyName } : undefined,
    );

    return await promise;
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

  leaveThread: async (
    input: ProtocolLeaveThreadInput,
    utils: LeaveThreadUtils,
  ): Promise<LeaveThreadResult> => {
    const { threadInfo, viewerID } = input;
    const { modifyFarcasterMembership, dispatchActionPromise, auxUserStore } =
      utils;

    const conversationId = conversationIDFromFarcasterThreadID(threadInfo.id);

    const promise = (async () => {
      if (viewerID) {
        const viewerFID = getFIDFromUserID(viewerID, auxUserStore.auxUserInfos);

        if (viewerFID) {
          const modifyFarcasterMembershipInput: ModifyFarcasterMembershipInput =
            {
              conversationId,
              action: 'remove',
              targetFid: parseInt(viewerFID, 10),
            };

          await modifyFarcasterMembership(modifyFarcasterMembershipInput);
        }
      }

      return {
        updatesResult: {
          newUpdates: [
            {
              type: updateTypes.DELETE_THREAD,
              threadID: threadInfo.id,
              id: threadInfo.id,
              time: Date.now(),
            },
          ],
        },
      };
    })();

    const customKeyName = `${leaveThreadActionTypes.started}:${threadInfo.id}`;
    void dispatchActionPromise(leaveThreadActionTypes, promise, {
      customKeyName,
    });
    await promise;

    return {
      invalidatedThreads: [threadInfo.id],
    };
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
    await utils.farcasterMessageFetching.fetchMoreMessages(
      threadID,
      numMessagesToFetch ?? defaultNumberPerThread,
      currentNumberOfFetchedMessages,
    );
  },

  createPendingThread: (
    input: ProtocolCreatePendingThreadInput,
  ): RawThreadInfo => {
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
      },
    } = input;
    const farcasterThreadType = assertFarcasterThreadType(threadType);
    return {
      minimallyEncoded: true,
      farcaster: true,
      id: threadID,
      type: farcasterThreadType,
      name: name ?? null,
      description: null,
      color: threadColor ?? generatePendingThreadColor(memberIDs),
      community: null,
      creationTime,
      parentThreadID: parentThreadInfo?.id ?? null,
      containingThreadID: getContainingThreadID(
        parentThreadInfo,
        farcasterThreadType,
      ),
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
      pinnedCount: 0,
    };
  },

  couldBeCreatedFromPendingThread: () => true,

  canBeFrozen: (thread: ThreadInfo) => {
    return thread.type === farcasterThreadTypes.FARCASTER_PERSONAL;
  },

  pendingThreadType,

  createRealThreadFromPendingThread: async (
    params: CreateRealThreadParameters,
  ): Promise<{
    +threadID: string,
    +threadType: ThreadType,
  }> => {
    const {
      threadInfo,
      farcasterFetchConversation,
      createFarcasterGroup,
      viewerID,
      auxUserStore,
      dispatch,
    } = params;
    if (!threadIsPending(threadInfo.id)) {
      return {
        threadID: threadInfo.id,
        threadType: threadInfo.type,
      };
    }
    invariant(viewerID, 'Viewer ID should be present');

    const name =
      threadInfo.name ??
      threadInfo.members.map(member => member.username).join(', ');

    const otherMembersFIDs = threadOtherMembers(threadInfo.members, viewerID)
      .map(member => member.id)
      .map(otherMemberID =>
        getFIDFromUserID(otherMemberID, auxUserStore.auxUserInfos),
      )
      .filter(Boolean)
      .map(id => parseInt(id, 10));

    if (threadTypeIsPersonal(threadInfo.type)) {
      const viewerFID = getFIDFromUserID(viewerID, auxUserStore.auxUserInfos);

      const otherUserFID = otherMembersFIDs[0];

      invariant(viewerFID, 'Viewer FID should be present');
      invariant(otherUserFID, 'Other user FID should be present');

      // We can deterministically generate a future conversation ID for 1:1
      const conversationID = farcasterPersonalConversationID(
        viewerFID,
        otherUserFID,
      );

      // We construct a thread here to make it work with our design.
      // When sending a message, the thread is going to be fetched,
      // so Farcaster remains the source of truth
      const threadID = farcasterThreadIDFromConversationID(conversationID);
      dispatch({
        type: processFarcasterOpsActionType,
        payload: {
          rawMessageInfos: [],
          updateInfos: [
            {
              type: updateTypes.JOIN_THREAD,
              id: uuid.v4(),
              time: Date.now(),
              threadInfo: createFarcasterRawThreadInfoPersonal({
                ...threadInfo,
                id: threadID,
              }),
              rawMessageInfos: [],
              truncationStatus: messageTruncationStatus.UNCHANGED,
              rawEntryInfos: [],
            },
          ],
        },
      });

      return {
        threadID,
        threadType: threadInfo.type,
      };
    }

    let input = {
      participantFids: otherMembersFIDs,
      name: name.substring(0, 32),
    };
    if (threadInfo.description) {
      input = {
        ...input,
        description: threadInfo.description,
      };
    }
    const {
      result: { conversationId },
    } = await createFarcasterGroup(input);

    await farcasterFetchConversation(conversationId);

    return {
      threadID: farcasterThreadIDFromConversationID(conversationId),
      threadType: threadInfo.type,
    };
  },

  getRolePermissionBlobs: (threadType: ThreadType): RolePermissionBlobs => {
    const farcasterThreadType = assertFarcasterThreadType(threadType);
    return getFarcasterRolePermissionsBlobs(farcasterThreadType);
  },

  deleteMessage: async (): Promise<void> => {
    throw new Error('deleteMessage method is not yet implemented');
  },

  joinThread: async (
    input: ProtocolJoinThreadInput,
    utils: JoinThreadUtils,
  ): Promise<ThreadJoinPayload> => {
    const threadID = input.rawThreadInfo.id;
    const conversationID = conversationIDFromFarcasterThreadID(threadID);
    await utils.farcasterAcceptInvite({
      conversationId: conversationID,
    });

    await utils.refreshFarcasterConversation(conversationID);

    return ({
      updatesResult: { newUpdates: [] },
      rawMessageInfos: [],
      truncationStatuses: {},
      userInfos: [],
    }: ThreadJoinPayload);
  },

  onOpenThread: (
    input: ProtocolOnOpenThreadInput,
    utils: OnOpenThreadUtils,
  ) => {
    const { threadID } = input;
    const conversationID = conversationIDFromFarcasterThreadID(threadID);
    void utils.farcasterRefreshConversation(conversationID);
    void utils.farcasterMessageFetching.fetchMoreMessages(
      threadID,
      defaultNumberPerThread,
      0,
    );
  },

  threadIDMatchesProtocol: (threadID: string): boolean => {
    return farcasterThreadIDRegExp.test(threadID);
  },

  allowsDeletingSidebarSource: false,

  presentationDetails: {
    membershipChangesShownInThreadPreview: false,
    usersWithoutDeviceListExcludedFromSearchResult: false,
    supportsMediaGallery: false,
    nativeChatThreadListIcon: 'farcaster',
    webChatThreadListIcon: 'farcaster',
    threadAncestorLabel: () => 'Farcaster DC',
    protocolIcon: 'farcaster',
    description:
      'Farcaster Direct Casts are the native messaging protocol in ' +
      'Farcaster. They are not end-to-end encrypted, and the Farcaster ' +
      'team can see the contents of your messages.',
    topLevelThread: {
      type: 'label',
      label: 'Farcaster',
    },
  },

  supportsEncryptedMultimedia: false,
  supportsSendingVideos: false,
  canSendMultipleMedia: false,
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
  viewerCanUpdateOwnRole: false,
  protocolName: protocolNames.FARCASTER_DC,
  canReactToRobotext: false,
  supportsThreadRefreshing: true,
  temporarilyDisabledFeatures: {
    changingThreadAvatar: true,
    deletingMessages: true,
    pinningMessages: true,
  },
  supportsMessageEdit: false,
  supportsRelationships: false,
};

function pendingThreadType(numberOfOtherMembers: number) {
  if (numberOfOtherMembers <= 1) {
    return threadTypes.FARCASTER_PERSONAL;
  } else {
    return threadTypes.FARCASTER_GROUP;
  }
}

export { farcasterThreadProtocol };
