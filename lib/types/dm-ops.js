// @flow

import t, { type TInterface, type TUnion, type TStructProps } from 'tcomb';

import { clientAvatarValidator, type ClientAvatar } from './avatar-types.js';
import type { RawMessageInfo } from './message-types.js';
import type { NotificationsCreationData } from './notif-types.js';
import type { OutboundP2PMessage } from './sqlite-types.js';
import {
  type NonSidebarThickThreadType,
  nonSidebarThickThreadTypes,
  type ThickThreadType,
  thickThreadTypeValidator,
} from './thread-types-enum.js';
import type { ClientUpdateInfo } from './update-types.js';
import { values } from '../utils/objects.js';
import { tColor, tShape, tString, tUserID } from '../utils/validation-utils.js';

export const dmOperationTypes = Object.freeze({
  CREATE_THREAD: 'create_thread',
  CREATE_SIDEBAR: 'create_sidebar',
  SEND_TEXT_MESSAGE: 'send_text_message',
  SEND_REACTION_MESSAGE: 'send_reaction_message',
  SEND_EDIT_MESSAGE: 'send_edit_message',
  ADD_MEMBERS: 'add_members',
  ADD_VIEWER_TO_THREAD_MEMBERS: 'add_viewer_to_thread_members',
  JOIN_THREAD: 'join_thread',
  LEAVE_THREAD: 'leave_thread',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_THREAD_SETTINGS: 'change_thread_settings',
  CHANGE_THREAD_SETTINGS_AND_ADD_VIEWER:
    'change_thread_settings_and_add_viewer',
});
export type DMOperationType = $Values<typeof dmOperationTypes>;

export type CreateThickRawThreadInfoInput = {
  +threadID: string,
  +threadType: ThickThreadType,
  +creationTime: number,
  +parentThreadID?: ?string,
  +allMemberIDs: $ReadOnlyArray<string>,
  +roleID: string,
  +unread: boolean,
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
    allMemberIDs: t.list(tUserID),
    roleID: t.String,
    unread: t.Boolean,
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
  +messageID: string,
  +addedUserIDs: $ReadOnlyArray<string>,
};
const dmAddMembersBaseValidatorShape = {
  editorID: tUserID,
  time: t.Number,
  messageID: t.String,
  addedUserIDs: t.list(tUserID),
};

export type DMAddMembersOperation = $ReadOnly<{
  +type: 'add_members',
  +threadID: string,
  ...DMAddMembersBase,
}>;
export const dmAddMembersOperationValidator: TInterface<DMAddMembersOperation> =
  tShape<DMAddMembersOperation>({
    type: tString(dmOperationTypes.ADD_MEMBERS),
    threadID: t.String,
    ...dmAddMembersBaseValidatorShape,
  });

export type DMAddViewerToThreadMembersOperation = $ReadOnly<{
  +type: 'add_viewer_to_thread_members',
  +existingThreadDetails: CreateThickRawThreadInfoInput,
  ...DMAddMembersBase,
}>;
export const dmAddViewerToThreadMembersValidator: TInterface<DMAddViewerToThreadMembersOperation> =
  tShape<DMAddViewerToThreadMembersOperation>({
    type: tString(dmOperationTypes.ADD_VIEWER_TO_THREAD_MEMBERS),
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

export type DMRemoveMembersOperation = {
  +type: 'remove_members',
  +editorID: string,
  +time: number,
  +messageID: string,
  +threadID: string,
  +removedUserIDs: $ReadOnlyArray<string>,
};
export const dmRemoveMembersOperationValidator: TInterface<DMRemoveMembersOperation> =
  tShape<DMRemoveMembersOperation>({
    type: tString(dmOperationTypes.REMOVE_MEMBERS),
    editorID: tUserID,
    time: t.Number,
    messageID: t.String,
    threadID: t.String,
    removedUserIDs: t.list(tUserID),
  });

export type DMThreadSettingsChangesBase = {
  +name?: string,
  +description?: string,
  +color?: string,
  +avatar?: ClientAvatar,
};

type DMThreadSettingsChanges = $ReadOnly<{
  ...DMThreadSettingsChangesBase,
  +newMemberIDs?: $ReadOnlyArray<string>,
}>;

type DMChangeThreadSettingsBase = {
  +editorID: string,
  +time: number,
  +changes: DMThreadSettingsChanges,
  +messageIDsPrefix: string,
};

const dmChangeThreadSettingsBaseValidatorShape: TStructProps<DMChangeThreadSettingsBase> =
  {
    editorID: tUserID,
    time: t.Number,
    changes: tShape({
      name: t.maybe(t.String),
      description: t.maybe(t.String),
      color: t.maybe(tColor),
      newMemberIDs: t.maybe(t.list(tUserID)),
      avatar: t.maybe(clientAvatarValidator),
    }),
    messageIDsPrefix: t.String,
  };

export type DMChangeThreadSettingsOperation = $ReadOnly<{
  +type: 'change_thread_settings',
  +threadID: string,
  ...DMChangeThreadSettingsBase,
}>;
export const dmChangeThreadSettingsOperationValidator: TInterface<DMChangeThreadSettingsOperation> =
  tShape<DMChangeThreadSettingsOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_SETTINGS),
    threadID: t.String,
    ...dmChangeThreadSettingsBaseValidatorShape,
  });

export type DMChangeThreadSettingsAndAddViewerOperation = $ReadOnly<{
  +type: 'change_thread_settings_and_add_viewer',
  +existingThreadDetails: CreateThickRawThreadInfoInput,
  ...DMChangeThreadSettingsBase,
}>;
export const dmChangeThreadSettingsAndAddViewerOperationValidator: TInterface<DMChangeThreadSettingsAndAddViewerOperation> =
  tShape<DMChangeThreadSettingsAndAddViewerOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_SETTINGS_AND_ADD_VIEWER),
    existingThreadDetails: createThickRawThreadInfoInputValidator,
    ...dmChangeThreadSettingsBaseValidatorShape,
  });

export type DMOperation =
  | DMCreateThreadOperation
  | DMCreateSidebarOperation
  | DMSendTextMessageOperation
  | DMSendReactionMessageOperation
  | DMSendEditMessageOperation
  | DMAddMembersOperation
  | DMAddViewerToThreadMembersOperation
  | DMJoinThreadOperation
  | DMLeaveThreadOperation
  | DMRemoveMembersOperation
  | DMChangeThreadSettingsOperation
  | DMChangeThreadSettingsAndAddViewerOperation;
export const dmOperationValidator: TUnion<DMOperation> = t.union([
  dmCreateThreadOperationValidator,
  dmCreateSidebarOperationValidator,
  dmSendTextMessageOperationValidator,
  dmSendReactionMessageOperationValidator,
  dmSendEditMessageOperationValidator,
  dmAddMembersOperationValidator,
  dmAddViewerToThreadMembersValidator,
  dmJoinThreadOperationValidator,
  dmLeaveThreadOperationValidator,
  dmRemoveMembersOperationValidator,
  dmChangeThreadSettingsOperationValidator,
  dmChangeThreadSettingsAndAddViewerOperationValidator,
]);

export type DMOperationResult = {
  rawMessageInfos: Array<RawMessageInfo>,
  updateInfos: Array<ClientUpdateInfo>,
};

export const processDMOpsActionType = 'PROCESS_DM_OPS';

export type ProcessDMOpsPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
  +outboundP2PMessages: ?$ReadOnlyArray<OutboundP2PMessage>,
  // For messages that could be retried from UI, we need to bind DM `messageID`
  // with `outboundP2PMessages` to keep track of whether all P2P messages
  // were queued on Tunnelbroker.
  +messageIDWithoutAutoRetry: ?string,
  +notificationsCreationData: ?NotificationsCreationData,
};

export const queueDMOpsActionType = 'QUEUE_DM_OPS';
export type QueueDMOpsPayload = {
  +operation: DMOperation,
  +threadID: string,
  +timestamp: number,
};

export const pruneDMOpsQueueActionType = 'PRUNE_DM_OPS_QUEUE';
export type PruneDMOpsQueuePayload = {
  +pruneMaxTimestamp: number,
};

export const clearQueuedThreadDMOpsActionType = 'CLEAR_QUEUED_THREAD_DM_OPS';
export type ClearQueuedThreadDMOpsPayload = {
  +threadID: string,
};

export type QueuedDMOperations = {
  +operations: {
    +[threadID: string]: $ReadOnlyArray<{
      +operation: DMOperation,
      +timestamp: number,
    }>,
  },
};

export type SendDMStartedPayload = {
  +messageID: string,
};

export type SendDMOpsSuccessPayload = {
  +messageID: string,
  +outboundP2PMessageIDs: $ReadOnlyArray<string>,
};

export const sendDMActionTypes = Object.freeze({
  started: 'SEND_DM_STARTED',
  success: 'SEND_DM_SUCCESS',
  failed: 'SEND_DM_FAILED',
});
