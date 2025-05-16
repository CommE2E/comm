// @flow

import * as React from 'react';

import type { UseSetThreadUnreadStatusInput } from '../../actions/activity-actions.js';
import type {
  UseCreateEntryInput,
  UseDeleteEntryInput,
  UseSaveEntryInput,
} from '../../actions/entry-actions.js';
import { type ProcessHolders } from '../../actions/holder-actions.js';
import {
  type LegacySendMultimediaMessageInput,
  type SendMultimediaMessageInput,
  type SendTextMessageInput,
  type FetchMessagesBeforeCursorInput,
  type FetchMostRecentMessagesInput,
} from '../../actions/message-actions.js';
import { type MediaMetadataReassignmentAction } from '../../actions/upload-actions.js';
import type { UseUpdateSubscriptionInput } from '../../actions/user-actions.js';
import type {
  UseChangeThreadSettingsInput,
  LeaveThreadInput,
  LeaveThreadResult,
} from '../../hooks/thread-hooks.js';
import type { RolePermissionBlobs } from '../../permissions/keyserver-permissions.js';
import type { ProcessOutboundP2PMessagesResult } from '../../tunnelbroker/peer-to-peer-context.js';
import type { TunnelbrokerSocketState } from '../../tunnelbroker/tunnelbroker-context.js';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../../types/activity-types.js';
import type {
  CalendarQuery,
  CreateEntryInfo,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResult,
  RawEntryInfo,
  SaveEntryInfo,
  SaveEntryResult,
} from '../../types/entry-types.js';
import type {
  SendMessageResult,
  SendMessagePayload,
  RawMultimediaMessageInfo,
  SendMultimediaMessagePayload,
  SendEditMessageRequest,
  SendEditMessageResult,
  SendReactionMessageRequest,
  FetchMessageInfosPayload,
  DeleteMessageRequest,
  DeleteMessageResponse,
} from '../../types/message-types.js';
import type { RawTextMessageInfo } from '../../types/messages/text.js';
import type {
  MemberInfoSansPermissions,
  MinimallyEncodedThickMemberInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
  RawThreadInfo,
  ThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from '../../types/redux-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../../types/subscription-types.js';
import type { ThreadPermissionsInfo } from '../../types/thread-permission-types.js';
import type { ThreadType } from '../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientDBThreadInfo,
  ClientNewThinThreadRequest,
  ClientThreadJoinRequest,
  LeaveThreadPayload,
  NewThickThreadRequest,
  NewThreadResult,
  ThreadJoinPayload,
  UpdateThreadRequest,
} from '../../types/thread-types.js';
import type { DispatchActionPromise } from '../../utils/redux-promise-utils.js';
import type {
  OutboundComposableDMOperationSpecification,
  OutboundDMOperationSpecification,
} from '../dm-ops/dm-op-types.js';
import type { FetchThickMessagesType } from '../message-utils.js';
import type { MessageNotifyType } from '../messages/message-spec.js';
import type { CreatePendingThreadArgs } from '../thread-utils.js';

export type ThreadTrait =
  | 'sidebar'
  | 'community'
  | 'announcement'
  | 'personal'
  | 'private'
  | 'communitySubthread';

export type ProtocolSendTextMessageInput = {
  +messageInfo: RawTextMessageInfo,
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
  +sidebarCreation: boolean,
};
export type SendTextMessageUtils = {
  +sendKeyserverTextMessage: SendTextMessageInput => Promise<SendMessageResult>,
  +sendComposableDMOperation: OutboundComposableDMOperationSpecification => Promise<ProcessOutboundP2PMessagesResult>,
};

export type ProtocolSendMultimediaMessageInput = {
  +messageInfo: RawMultimediaMessageInfo,
  +sidebarCreation: boolean,
  +isLegacy: boolean,
  +threadInfo: RawThreadInfo,
};
export type SendMultimediaMessageUtils = {
  +sendKeyserverMultimediaMessage: SendMultimediaMessageInput => Promise<SendMessageResult>,
  +legacyKeyserverSendMultimediaMessage: LegacySendMultimediaMessageInput => Promise<SendMessageResult>,
  +sendComposableDMOperation: OutboundComposableDMOperationSpecification => Promise<ProcessOutboundP2PMessagesResult>,
  +reassignThickThreadMedia: MediaMetadataReassignmentAction,
  +processHolders: ProcessHolders,
  +dispatch: Dispatch,
};

export type ProtocolEditTextMessageInput = {
  +messageID: string,
  +newText: string,
  +threadInfo: ThreadInfo,
  +viewerID: ?string,
};
export type EditTextMessageUtils = {
  +keyserverEditMessage: SendEditMessageRequest => Promise<SendEditMessageResult>,
  +dispatchActionPromise: DispatchActionPromise,
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
};

export type ProtocolChangeThreadSettingsInput = {
  +input: UseChangeThreadSettingsInput,
  +viewerID: ?string,
};
export type ChangeThreadSettingsUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverChangeThreadSettings: UpdateThreadRequest => Promise<ChangeThreadSettingsPayload>,
};

export type ProtocolCreateEntryInput = {
  +input: UseCreateEntryInput,
  +viewerID: ?string,
};
export type CreateEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverCreateEntry: CreateEntryInfo => Promise<CreateEntryPayload>,
};

export type ProtocolDeleteEntryInput = {
  +input: UseDeleteEntryInput,
  +viewerID: ?string,
  +originalEntry: RawEntryInfo,
};
export type DeleteEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverDeleteEntry: DeleteEntryInfo => Promise<DeleteEntryResult>,
};

export type ProtocolEditEntryInput = {
  +input: UseSaveEntryInput,
  +viewerID: ?string,
  +originalEntry: RawEntryInfo,
};
export type EditEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverEditEntry: SaveEntryInfo => Promise<SaveEntryResult>,
};

export type ProtocolSetThreadUnreadStatusInput = {
  +input: UseSetThreadUnreadStatusInput,
  +viewerID: ?string,
};
export type SetThreadUnreadStatusUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverSetThreadUnreadStatus: SetThreadUnreadStatusRequest => Promise<SetThreadUnreadStatusPayload>,
};

export type ProtocolSendReactionInput = {
  +messageID: string,
  +threadInfo: ThreadInfo,
  +reaction: string,
  +action: 'remove_reaction' | 'add_reaction',
  +viewerID: string,
  +showErrorAlert: () => mixed,
};
export type SendReactionUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverSendReaction: SendReactionMessageRequest => Promise<SendMessageResult>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolAddThreadMembersInput = {
  +threadInfo: ThreadInfo,
  +newMemberIDs: $ReadOnlyArray<string>,
};
export type AddThreadMembersUtils = {
  +dmAddThreadMembers: (
    newMemberIDs: $ReadOnlyArray<string>,
    threadInfo: ThreadInfo,
  ) => Promise<void>,
  +changeThreadSettings: UseChangeThreadSettingsInput => Promise<ChangeThreadSettingsPayload>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolUpdateSubscriptionInput = {
  +input: UseUpdateSubscriptionInput,
  +viewerID: ?string,
};
export type UpdateSubscriptionUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverUpdateSubscription: SubscriptionUpdateRequest => Promise<SubscriptionUpdateResult>,
};

export type ProtocolLeaveThreadInput = {
  +threadInfo: ThreadInfo,
  +viewerID: ?string,
};
export type LeaveThreadUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverLeaveThread: LeaveThreadInput => Promise<LeaveThreadPayload>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolFetchMessageInput = {
  +numMessagesToFetch?: ?number,
  +threadID: string,
  +currentNumberOfFetchedMessages: number,
  +oldestMessageServerID: ?string,
};
export type FetchMessageUtils = {
  +fetchThickThreadMessages: FetchThickMessagesType,
  +keyserverFetchMessagesBeforeCursor: FetchMessagesBeforeCursorInput => Promise<FetchMessageInfosPayload>,
  +keyserverFetchMostRecentMessages: FetchMostRecentMessagesInput => Promise<FetchMessageInfosPayload>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolCreatePendingThreadInput = {
  +createPendingThreadArgs: CreatePendingThreadArgs,
  +creationTime: number,
  +membershipPermissions: ThreadPermissionsInfo,
  +role: RoleInfo,
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};

export type CreateRealThreadParameters = {
  +threadInfo: ThreadInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +createNewThinThread: ClientNewThinThreadRequest => Promise<NewThreadResult>,
  +createNewThickThread: NewThickThreadRequest => Promise<string>,
  +sourceMessageID: ?string,
  +viewerID: ?string,
  +handleError?: () => mixed,
  +calendarQuery: CalendarQuery,
};

export type ProtocolDeleteMessageInput = {
  +messageID: string,
  +threadInfo: RawThreadInfo,
  +viewerID: ?string,
};
export type DeleteMessageUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverDeleteMessage: DeleteMessageRequest => Promise<DeleteMessageResponse>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolJoinThreadInput = {
  +rawThreadInfo: RawThreadInfo,
  +viewerID: ?string,
};
export type JoinThreadUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverJoinThread: ClientThreadJoinRequest => Promise<ThreadJoinPayload>,
  +calendarQuery: () => CalendarQuery,
};

export type ThreadProtocol<
  RawThreadMemberType:
    | MemberInfoSansPermissions
    | MinimallyEncodedThickMemberInfo,
> = {
  +sendTextMessage: (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ) => Promise<SendMessagePayload>,
  +sendMultimediaMessage: (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ) => Promise<SendMultimediaMessagePayload>,
  +editTextMessage: (
    message: ProtocolEditTextMessageInput,
    utils: EditTextMessageUtils,
  ) => Promise<void>,
  +changeThreadSettings: (
    input: ProtocolChangeThreadSettingsInput,
    utils: ChangeThreadSettingsUtils,
  ) => Promise<ChangeThreadSettingsPayload>,
  +supportsCalendarHistory: boolean,
  +calendarIsOnline: (
    tunnelbrokerSocketState: TunnelbrokerSocketState,
    isKeyserverConnected: boolean,
  ) => boolean,
  +createCalendarEntry: (
    input: ProtocolCreateEntryInput,
    utils: CreateEntryUtils,
  ) => Promise<CreateEntryPayload>,
  +deleteCalendarEntry: (
    input: ProtocolDeleteEntryInput,
    utils: DeleteEntryUtils,
  ) => Promise<DeleteEntryResult>,
  +editCalendarEntry: (
    input: ProtocolEditEntryInput,
    utils: EditEntryUtils,
  ) => Promise<SaveEntryResult>,
  +setThreadUnreadStatus: (
    input: ProtocolSetThreadUnreadStatusInput,
    utils: SetThreadUnreadStatusUtils,
  ) => Promise<SetThreadUnreadStatusPayload>,
  +sendReaction: (
    input: ProtocolSendReactionInput,
    utils: SendReactionUtils,
  ) => Promise<mixed>,
  +addThreadMembers: (
    input: ProtocolAddThreadMembersInput,
    utils: AddThreadMembersUtils,
  ) => Promise<void>,
  +updateSubscription: (
    input: ProtocolUpdateSubscriptionInput,
    utils: UpdateSubscriptionUtils,
  ) => Promise<SubscriptionUpdateResult>,
  +leaveThread: (
    input: ProtocolLeaveThreadInput,
    utils: LeaveThreadUtils,
  ) => Promise<LeaveThreadResult>,
  +convertClientDBThreadInfo: (
    clientDBThreadInfo: ClientDBThreadInfo,
    members: $ReadOnlyArray<RawThreadMemberType>,
    roles: { +[id: string]: RoleInfo },
    minimallyEncodedCurrentUser: ThreadCurrentUserInfo,
  ) => RawThreadInfo,
  +fetchMessages: (
    input: ProtocolFetchMessageInput,
    utils: FetchMessageUtils,
  ) => Promise<void>,
  +createPendingThread: (
    input: ProtocolCreatePendingThreadInput,
  ) => RawThreadInfo,
  +couldBeCreatedFromPendingThread: (thread: RawThreadInfo) => boolean,
  // "Freezing" a thread can occur when a user blocks another user, and those
  // two users are the only members of a given chat.
  +canBeFrozen: (thread: ThreadInfo) => boolean,
  +pendingThreadType: (numberOfOtherMembers: number) => ThreadType,
  +createRealThreadFromPendingThread: (
    params: CreateRealThreadParameters,
  ) => Promise<{
    +threadID: string,
    +threadType: ThreadType,
  }>,
  +getRolePermissionBlobs: (threadType: ThreadType) => RolePermissionBlobs,
  +deleteMessage: (
    input: ProtocolDeleteMessageInput,
    utils: DeleteMessageUtils,
  ) => Promise<void>,
  +joinThread: (
    input: ProtocolJoinThreadInput,
    utils: JoinThreadUtils,
  ) => Promise<ThreadJoinPayload>,
  +threadIDMatchesProtocol: string => boolean,
  +allowsDeletingSidebarSource: boolean,
  +presentationDetails: {
    +membershipChangesShownInThreadPreview: boolean,
    +usersWithoutDeviceListExcludedFromSearchResult: boolean,
    +supportsMediaGallery: boolean,
    +nativeChatThreadListIcon: string,
    +webChatThreadListIcon: 'lock' | 'server',
    +threadAncestorLabel: (ancestorPath: React.Node) => React.Node,
    +threadSearchHeaderShowsGenesis: boolean,
  },
  +uploadMultimediaMetadataToKeyserver: boolean,
  +canActionsTargetPendingMessages: boolean,
  +sidebarConfig: {
    +sidebarThreadType: ThreadType,
    +pendingSidebarURLPrefix: string,
  },
  +shouldPerformSideEffectsBeforeSendingMessage: boolean,
  +messagesStoredOnServer: boolean,
  +arePendingThreadsDescendantsOfGenesis: boolean,
  // This flag is temporary. It should be deleted as a part of
  // https://linear.app/comm/issue/ENG-10729/consider-merging-activity-handlers
  +threadActivityUpdatedByDMActivityHandler: boolean,
  +membershipMessageNotifAction: MessageNotifyType,
};

export type ThreadSpec<
  RawThreadMemberType:
    | MemberInfoSansPermissions
    | MinimallyEncodedThickMemberInfo,
> = {
  +traits: $ReadOnlySet<ThreadTrait>,
  +protocol: ThreadProtocol<RawThreadMemberType>,
  +threadLabel: string,
};
