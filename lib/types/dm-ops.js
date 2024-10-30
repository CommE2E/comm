// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { clientAvatarValidator, type ClientAvatar } from './avatar-types.js';
import type { BlobOperation } from './holder-types.js';
import { type Media, mediaValidator } from './media-types.js';
import type { RawMessageInfo } from './message-types.js';
import type { RelationshipOperation } from './messages/update-relationship.js';
import type { NotificationsCreationData } from './notif-types.js';
import type { OutboundP2PMessage } from './sqlite-types.js';
import {
  type ThreadSubscription,
  threadSubscriptionValidator,
} from './subscription-types.js';
import {
  type NonSidebarThickThreadType,
  nonSidebarThickThreadTypes,
  type ThickThreadType,
  thickThreadTypeValidator,
} from './thread-types-enum.js';
import {
  threadTimestampsValidator,
  type ThreadTimestamps,
} from './thread-types.js';
import type { ClientUpdateInfo } from './update-types.js';
import { values } from '../utils/objects.js';
import { tColor, tShape, tString, tUserID } from '../utils/validation-utils.js';

export const dmOperationTypes = Object.freeze({
  CREATE_THREAD: 'create_thread',
  CREATE_SIDEBAR: 'create_sidebar',
  SEND_TEXT_MESSAGE: 'send_text_message',
  SEND_MULTIMEDIA_MESSAGE: 'send_multimedia_message',
  SEND_REACTION_MESSAGE: 'send_reaction_message',
  SEND_EDIT_MESSAGE: 'send_edit_message',
  ADD_MEMBERS: 'add_members',
  ADD_VIEWER_TO_THREAD_MEMBERS: 'add_viewer_to_thread_members',
  JOIN_THREAD: 'join_thread',
  LEAVE_THREAD: 'leave_thread',
  CHANGE_THREAD_SETTINGS: 'change_thread_settings',
  CHANGE_THREAD_SUBSCRIPTION: 'change_thread_subscription',
  CHANGE_THREAD_READ_STATUS: 'change_thread_read_status',
  CREATE_ENTRY: 'create_entry',
  DELETE_ENTRY: 'delete_entry',
  EDIT_ENTRY: 'edit_entry',
  UPDATE_RELATIONSHIP: 'update_relationship',
});
export type DMOperationType = $Values<typeof dmOperationTypes>;

type MemberIDWithSubscription = {
  +id: string,
  +subscription: ThreadSubscription,
};
export const memberIDWithSubscriptionValidator: TInterface<MemberIDWithSubscription> =
  tShape<MemberIDWithSubscription>({
    id: tUserID,
    subscription: threadSubscriptionValidator,
  });

export type CreateThickRawThreadInfoInput = {
  +threadID: string,
  +threadType: ThickThreadType,
  +creationTime: number,
  +parentThreadID?: ?string,
  +allMemberIDsWithSubscriptions: $ReadOnlyArray<MemberIDWithSubscription>,
  +roleID: string,
  +unread: boolean,
  +timestamps: ThreadTimestamps,
  +name?: ?string,
  +avatar?: ?ClientAvatar,
  +description?: ?string,
  +color?: ?string,
  +containingThreadID?: ?string,
  +sourceMessageID?: ?string,
  +repliesCount?: ?number,
  +pinnedCount?: ?number,
};
export const createThickRawThreadInfoInputValidator: TInterface<CreateThickRawThreadInfoInput> =
  tShape<CreateThickRawThreadInfoInput>({
    threadID: t.String,
    threadType: thickThreadTypeValidator,
    creationTime: t.Number,
    parentThreadID: t.maybe(t.String),
    allMemberIDsWithSubscriptions: t.list(memberIDWithSubscriptionValidator),
    roleID: t.String,
    unread: t.Boolean,
    timestamps: threadTimestampsValidator,
    name: t.maybe(t.String),
    avatar: t.maybe(clientAvatarValidator),
    description: t.maybe(t.String),
    color: t.maybe(t.String),
    containingThreadID: t.maybe(t.String),
    sourceMessageID: t.maybe(t.String),
    repliesCount: t.maybe(t.Number),
    pinnedCount: t.maybe(t.Number),
  });

export type DMCreateThreadOperation = {
  +type: 'create_thread',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +threadType: NonSidebarThickThreadType,
  +memberIDs: $ReadOnlyArray<string>,
  +roleID: string,
  +newMessageID: string,
};
export const dmCreateThreadOperationValidator: TInterface<DMCreateThreadOperation> =
  tShape<DMCreateThreadOperation>({
    type: tString(dmOperationTypes.CREATE_THREAD),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    threadType: t.enums.of(values(nonSidebarThickThreadTypes)),
    memberIDs: t.list(tUserID),
    roleID: t.String,
    newMessageID: t.String,
  });

export type DMCreateSidebarOperation = {
  +type: 'create_sidebar',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +parentThreadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +sourceMessageID: string,
  +roleID: string,
  +newSidebarSourceMessageID: string,
  +newCreateSidebarMessageID: string,
};
export const dmCreateSidebarOperationValidator: TInterface<DMCreateSidebarOperation> =
  tShape<DMCreateSidebarOperation>({
    type: tString(dmOperationTypes.CREATE_SIDEBAR),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    parentThreadID: t.String,
    memberIDs: t.list(tUserID),
    sourceMessageID: t.String,
    roleID: t.String,
    newSidebarSourceMessageID: t.String,
    newCreateSidebarMessageID: t.String,
  });

export type DMSendTextMessageOperation = {
  +type: 'send_text_message',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +messageID: string,
  +text: string,
};
export const dmSendTextMessageOperationValidator: TInterface<DMSendTextMessageOperation> =
  tShape<DMSendTextMessageOperation>({
    type: tString(dmOperationTypes.SEND_TEXT_MESSAGE),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    messageID: t.String,
    text: t.String,
  });

export type DMSendMultimediaMessageOperation = {
  +type: 'send_multimedia_message',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +messageID: string,
  +media: $ReadOnlyArray<Media>,
};
export const dmSendMultimediaMessageOperationValidator: TInterface<DMSendMultimediaMessageOperation> =
  tShape<DMSendMultimediaMessageOperation>({
    type: tString(dmOperationTypes.SEND_MULTIMEDIA_MESSAGE),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    messageID: t.String,
    media: t.list(mediaValidator),
  });

export type DMSendReactionMessageOperation = {
  +type: 'send_reaction_message',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +messageID: string,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};
export const dmSendReactionMessageOperationValidator: TInterface<DMSendReactionMessageOperation> =
  tShape<DMSendReactionMessageOperation>({
    type: tString(dmOperationTypes.SEND_REACTION_MESSAGE),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    messageID: t.String,
    targetMessageID: t.String,
    reaction: t.String,
    action: t.enums.of(['add_reaction', 'remove_reaction']),
  });

export type DMSendEditMessageOperation = {
  +type: 'send_edit_message',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +messageID: string,
  +targetMessageID: string,
  +text: string,
};
export const dmSendEditMessageOperationValidator: TInterface<DMSendEditMessageOperation> =
  tShape<DMSendEditMessageOperation>({
    type: tString(dmOperationTypes.SEND_EDIT_MESSAGE),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    messageID: t.String,
    targetMessageID: t.String,
    text: t.String,
  });

type DMAddMembersBase = {
  +editorID: string,
  +time: number,
  +addedUserIDs: $ReadOnlyArray<string>,
};
const dmAddMembersBaseValidatorShape = {
  editorID: tUserID,
  time: t.Number,
  addedUserIDs: t.list(tUserID),
};

export type DMAddMembersOperation = $ReadOnly<{
  +type: 'add_members',
  +threadID: string,
  +messageID: string,
  ...DMAddMembersBase,
}>;
export const dmAddMembersOperationValidator: TInterface<DMAddMembersOperation> =
  tShape<DMAddMembersOperation>({
    type: tString(dmOperationTypes.ADD_MEMBERS),
    threadID: t.String,
    messageID: t.String,
    ...dmAddMembersBaseValidatorShape,
  });

export type DMAddViewerToThreadMembersOperation = $ReadOnly<{
  +type: 'add_viewer_to_thread_members',
  +messageID: ?string,
  +existingThreadDetails: CreateThickRawThreadInfoInput,
  ...DMAddMembersBase,
}>;
export const dmAddViewerToThreadMembersValidator: TInterface<DMAddViewerToThreadMembersOperation> =
  tShape<DMAddViewerToThreadMembersOperation>({
    type: tString(dmOperationTypes.ADD_VIEWER_TO_THREAD_MEMBERS),
    messageID: t.maybe(t.String),
    existingThreadDetails: createThickRawThreadInfoInputValidator,
    ...dmAddMembersBaseValidatorShape,
  });

export type DMJoinThreadOperation = {
  +type: 'join_thread',
  +joinerID: string,
  +time: number,
  +messageID: string,
  +existingThreadDetails: CreateThickRawThreadInfoInput,
};
export const dmJoinThreadOperationValidator: TInterface<DMJoinThreadOperation> =
  tShape<DMJoinThreadOperation>({
    type: tString(dmOperationTypes.JOIN_THREAD),
    joinerID: tUserID,
    time: t.Number,
    messageID: t.String,
    existingThreadDetails: createThickRawThreadInfoInputValidator,
  });

export type DMLeaveThreadOperation = {
  +type: 'leave_thread',
  +editorID: string,
  +time: number,
  +messageID: string,
  +threadID: string,
};
export const dmLeaveThreadOperationValidator: TInterface<DMLeaveThreadOperation> =
  tShape<DMLeaveThreadOperation>({
    type: tString(dmOperationTypes.LEAVE_THREAD),
    editorID: tUserID,
    time: t.Number,
    messageID: t.String,
    threadID: t.String,
  });

export type DMThreadSettingsChanges = {
  +name?: string,
  +description?: string,
  +color?: string,
  +avatar?: ClientAvatar | null,
};

export type DMChangeThreadSettingsOperation = $ReadOnly<{
  +type: 'change_thread_settings',
  +threadID: string,
  +editorID: string,
  +time: number,
  +changes: DMThreadSettingsChanges,
  +messageIDsPrefix: string,
}>;
export const dmChangeThreadSettingsOperationValidator: TInterface<DMChangeThreadSettingsOperation> =
  tShape<DMChangeThreadSettingsOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_SETTINGS),
    threadID: t.String,
    editorID: tUserID,
    time: t.Number,
    changes: tShape({
      name: t.maybe(t.String),
      description: t.maybe(t.String),
      color: t.maybe(tColor),
      avatar: t.maybe(clientAvatarValidator),
    }),
    messageIDsPrefix: t.String,
  });

export type DMChangeThreadSubscriptionOperation = {
  +type: 'change_thread_subscription',
  +time: number,
  +threadID: string,
  +creatorID: string,
  +subscription: ThreadSubscription,
};
export const dmChangeThreadSubscriptionOperationValidator: TInterface<DMChangeThreadSubscriptionOperation> =
  tShape<DMChangeThreadSubscriptionOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_SUBSCRIPTION),
    time: t.Number,
    threadID: t.String,
    creatorID: tUserID,
    subscription: threadSubscriptionValidator,
  });

export type DMChangeThreadReadStatusOperation = {
  +type: 'change_thread_read_status',
  +time: number,
  +threadID: string,
  +creatorID: string,
  +unread: boolean,
};
export const dmChangeThreadReadStatusOperationValidator: TInterface<DMChangeThreadReadStatusOperation> =
  tShape<DMChangeThreadReadStatusOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_READ_STATUS),
    time: t.Number,
    threadID: t.String,
    creatorID: tUserID,
    unread: t.Boolean,
  });

export type ComposableDMOperation =
  | DMSendTextMessageOperation
  | DMSendMultimediaMessageOperation;

export type DMCreateEntryOperation = {
  +type: 'create_entry',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +entryID: string,
  +entryDate: string,
  +text: string,
  +messageID: string,
};
export const dmCreateEntryOperationValidator: TInterface<DMCreateEntryOperation> =
  tShape<DMCreateEntryOperation>({
    type: tString(dmOperationTypes.CREATE_ENTRY),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    entryID: t.String,
    entryDate: t.String,
    text: t.String,
    messageID: t.String,
  });

export type DMDeleteEntryOperation = {
  +type: 'delete_entry',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +creationTime: number,
  +entryID: string,
  +entryDate: string,
  +prevText: string,
  +messageID: string,
};
export const dmDeleteEntryOperationValidator: TInterface<DMDeleteEntryOperation> =
  tShape<DMDeleteEntryOperation>({
    type: tString(dmOperationTypes.DELETE_ENTRY),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    creationTime: t.Number,
    entryID: t.String,
    entryDate: t.String,
    prevText: t.String,
    messageID: t.String,
  });

export type DMEditEntryOperation = {
  +type: 'edit_entry',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +creationTime: number,
  +entryID: string,
  +entryDate: string,
  +text: string,
  +messageID: string,
};
export const dmEditEntryOperationValidator: TInterface<DMEditEntryOperation> =
  tShape<DMEditEntryOperation>({
    type: tString(dmOperationTypes.EDIT_ENTRY),
    threadID: t.String,
    creatorID: tUserID,
    creationTime: t.Number,
    time: t.Number,
    entryID: t.String,
    entryDate: t.String,
    text: t.String,
    messageID: t.String,
  });

export type DMUpdateRelationshipOperation = {
  +type: 'update_relationship',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +operation: RelationshipOperation,
  +targetUserID: string,
  +messageID: string,
};
export const dmUpdateRelationshipOperationValidator: TInterface<DMUpdateRelationshipOperation> =
  tShape<DMUpdateRelationshipOperation>({
    type: tString(dmOperationTypes.UPDATE_RELATIONSHIP),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    operation: t.enums.of([
      'request_sent',
      'request_accepted',
      'farcaster_mutual',
    ]),
    targetUserID: tUserID,
    messageID: t.String,
  });

export type DMOperation =
  | DMCreateThreadOperation
  | DMCreateSidebarOperation
  | DMSendTextMessageOperation
  | DMSendMultimediaMessageOperation
  | DMSendReactionMessageOperation
  | DMSendEditMessageOperation
  | DMAddMembersOperation
  | DMAddViewerToThreadMembersOperation
  | DMJoinThreadOperation
  | DMLeaveThreadOperation
  | DMChangeThreadSettingsOperation
  | DMChangeThreadSubscriptionOperation
  | DMChangeThreadReadStatusOperation
  | DMCreateEntryOperation
  | DMDeleteEntryOperation
  | DMEditEntryOperation
  | DMUpdateRelationshipOperation;
export const dmOperationValidator: TUnion<DMOperation> = t.union([
  dmCreateThreadOperationValidator,
  dmCreateSidebarOperationValidator,
  dmSendTextMessageOperationValidator,
  dmSendMultimediaMessageOperationValidator,
  dmSendReactionMessageOperationValidator,
  dmSendEditMessageOperationValidator,
  dmAddMembersOperationValidator,
  dmAddViewerToThreadMembersValidator,
  dmJoinThreadOperationValidator,
  dmLeaveThreadOperationValidator,
  dmChangeThreadSettingsOperationValidator,
  dmChangeThreadSubscriptionOperationValidator,
  dmChangeThreadReadStatusOperationValidator,
  dmCreateEntryOperationValidator,
  dmDeleteEntryOperationValidator,
  dmEditEntryOperationValidator,
  dmUpdateRelationshipOperationValidator,
]);

export type DMBlobOperation = $ReadOnly<{
  ...BlobOperation,
  +dmOpType: 'inbound_only' | 'outbound_only' | 'inbound_and_outbound',
}>;

export type DMOperationResult = {
  rawMessageInfos: Array<RawMessageInfo>,
  updateInfos: Array<ClientUpdateInfo>,
  blobOps: Array<DMBlobOperation>,
  notificationsCreationData: ?NotificationsCreationData,
};

export const processDMOpsActionType = 'PROCESS_DM_OPS';

export type ProcessDMOpsPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
  +outboundP2PMessages: ?$ReadOnlyArray<OutboundP2PMessage>,
  // For messages that could be retried from UI, we need to bind DM `messageID`
  // with `outboundP2PMessages` to keep track of whether all P2P messages
  // were queued on Tunnelbroker.
  +composableMessageID: ?string,
  +notificationsCreationData: ?NotificationsCreationData,
};

export const queueDMOpsActionType = 'QUEUE_DM_OPS';
export type QueueDMOpsPayload = {
  +operation: DMOperation,
  +timestamp: number,
  +condition:
    | {
        +type: 'thread',
        +threadID: string,
      }
    | {
        +type: 'entry',
        +entryID: string,
      }
    | {
        +type: 'message',
        +messageID: string,
      }
    | {
        +type: 'membership',
        +threadID: string,
        +userID: string,
      },
};

export const pruneDMOpsQueueActionType = 'PRUNE_DM_OPS_QUEUE';
export type PruneDMOpsQueuePayload = {
  +pruneMaxTimestamp: number,
};

export const clearQueuedThreadDMOpsActionType = 'CLEAR_QUEUED_THREAD_DM_OPS';
export type ClearQueuedThreadDMOpsPayload = {
  +threadID: string,
};

export const clearQueuedMessageDMOpsActionType = 'CLEAR_QUEUED_MESSAGE_DM_OPS';
export type ClearQueuedMessageDMOpsPayload = {
  +messageID: string,
};

export const clearQueuedEntryDMOpsActionType = 'CLEAR_QUEUED_ENTRY_DM_OPS';
export type ClearQueuedEntryDMOpsPayload = {
  +entryID: string,
};

export const clearQueuedMembershipDMOpsActionType =
  'CLEAR_QUEUED_MEMBERSHIP_DM_OPS';
export type ClearQueuedMembershipDMOpsPayload = {
  +threadID: string,
  +userID: string,
};

export type OperationsQueue = $ReadOnlyArray<{
  +operation: DMOperation,
  +timestamp: number,
}>;

export type QueuedDMOperations = {
  +threadQueue: {
    +[threadID: string]: OperationsQueue,
  },
  +messageQueue: {
    +[messageID: string]: OperationsQueue,
  },
  +entryQueue: {
    +[entryID: string]: OperationsQueue,
  },
  +membershipQueue: {
    +[threadID: string]: {
      +[memberID: string]: OperationsQueue,
    },
  },
};
