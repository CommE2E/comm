// @flow

import { getFarcasterRolePermissionsBlobs } from '../../../permissions/farcaster-permissions.js';
import type { RolePermissionBlobs } from '../../../permissions/thread-permissions.js';
import type { SetThreadUnreadStatusPayload } from '../../../types/activity-types.js';
import type {
  CreateEntryPayload,
  DeleteEntryResult,
  SaveEntryResult,
} from '../../../types/entry-types.js';
import {
  type SendMessagePayload,
  type SendMultimediaMessagePayload,
} from '../../../types/message-types.js';
import type {
  FarcasterRawThreadInfo,
  MemberInfoSansPermissions,
  RawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
} from '../../../types/minimally-encoded-thread-permissions-types.js';
import type { SubscriptionUpdateResult } from '../../../types/subscription-types.js';
import type { ThreadType } from '../../../types/thread-types-enum.js';
import { assertFarcasterThreadType } from '../../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientDBThreadInfo,
  ThreadJoinPayload,
} from '../../../types/thread-types.js';
import { farcasterThreadIDRegExp } from '../../../utils/validation-utils.js';
import { messageNotifyTypes } from '../../messages/message-spec.js';
import type { ThreadProtocol } from '../thread-spec.js';

const farcasterThreadProtocol: ThreadProtocol<MemberInfoSansPermissions> = {
  sendTextMessage: async (): Promise<SendMessagePayload> => {
    throw new Error('sendTextMessage method is not yet implemented');
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

  fetchMessages: async (): Promise<void> => {
    throw new Error('fetchMessages method is not yet implemented');
  },

  createPendingThread: (): RawThreadInfo => {
    throw new Error('createPendingThread method is not yet implemented');
  },

  couldBeCreatedFromPendingThread: () => true,

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
  threadActivityUpdatedByDMActivityHandler: false,
  membershipMessageNotifAction: messageNotifyTypes.NONE,
  shouldConvertIDs: false,
  dataIsBackedUp: true,
};

export { farcasterThreadProtocol };
