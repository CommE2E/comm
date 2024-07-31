// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { clientAvatarValidator, type ClientAvatar } from './avatar-types.js';
import type { RawMessageInfo } from './message-types.js';
import type { OutboundP2PMessage } from './sqlite-types.js';
import {
  type NonSidebarThickThreadType,
  nonSidebarThickThreadTypes,
  type ThickThreadType,
  thickThreadTypeValidator,
} from './thread-types-enum.js';
import type { ThreadChanges } from './thread-types.js';
import type { ClientUpdateInfo } from './update-types.js';
import { threadSettingsChangesValidator } from './validators/thread-validators.js';
import { values } from '../utils/objects.js';
import { tShape, tString, tUserID } from '../utils/validation-utils.js';

export const dmOperationTypes = Object.freeze({
  CREATE_THREAD: 'create_thread',
  CREATE_SIDEBAR: 'create_sidebar',
  SEND_TEXT_MESSAGE: 'send_text_message',
  SEND_REACTION_MESSAGE: 'send_reaction_message',
  SEND_EDIT_MESSAGE: 'send_edit_message',
  ADD_MEMBERS: 'add_members',
  JOIN_THREAD: 'join_thread',
  LEAVE_THREAD: 'leave_thread',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_THREAD_SETTINGS: 'change_thread_settings',
});
export type DMOperationType = $Values<typeof dmOperationTypes>;

export type CreateThickRawThreadInfoInput = {
  +threadID: string,
  +threadType: ThickThreadType,
  +creationTime: number,
  +parentThreadID?: ?string,
  +allMemberIDs: $ReadOnlyArray<string>,
  +roleID: string,
  +creatorID: string,
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
    creatorID: tUserID,
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

export type DMAddMembersOperation = {
  +type: 'add_members',
  +editorID: string,
  +time: number,
  +messageID: string,
  +addedUserIDs: $ReadOnlyArray<string>,
  +existingThreadDetails: CreateThickRawThreadInfoInput,
};
export const dmAddMembersOperationValidator: TInterface<DMAddMembersOperation> =
  tShape<DMAddMembersOperation>({
    type: tString(dmOperationTypes.ADD_MEMBERS),
    editorID: tUserID,
    time: t.Number,
    messageID: t.String,
    addedUserIDs: t.list(tUserID),
    existingThreadDetails: createThickRawThreadInfoInputValidator,
  });

export type DMJoinThreadOperation = {
  +type: 'join_thread',
  +editorID: string,
  +time: number,
  +messageID: string,
  +existingThreadDetails: CreateThickRawThreadInfoInput,
};
export const dmJoinThreadOperationValidator: TInterface<DMJoinThreadOperation> =
  tShape<DMJoinThreadOperation>({
    type: tString(dmOperationTypes.JOIN_THREAD),
    editorID: tUserID,
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

export type DMChangeThreadSettingsOperation = {
  +type: 'change_thread_settings',
  +editorID: string,
  +time: number,
  +changes: ThreadChanges,
  +messageIDsPrefix: string,
  +existingThreadDetails: CreateThickRawThreadInfoInput,
};
export const dmChangeThreadSettingsOperationValidator: TInterface<DMChangeThreadSettingsOperation> =
  tShape<DMChangeThreadSettingsOperation>({
    type: tString(dmOperationTypes.CHANGE_THREAD_SETTINGS),
    editorID: tUserID,
    time: t.Number,
    changes: threadSettingsChangesValidator,
    messageIDsPrefix: t.String,
    existingThreadDetails: createThickRawThreadInfoInputValidator,
  });

export type DMOperation =
  | DMCreateThreadOperation
  | DMCreateSidebarOperation
  | DMSendTextMessageOperation
  | DMSendReactionMessageOperation
  | DMSendEditMessageOperation
  | DMAddMembersOperation
  | DMJoinThreadOperation
  | DMLeaveThreadOperation
  | DMRemoveMembersOperation
  | DMChangeThreadSettingsOperation;
export const dmOperationValidator: TUnion<DMOperation> = t.union([
  dmCreateThreadOperationValidator,
  dmCreateSidebarOperationValidator,
  dmSendTextMessageOperationValidator,
  dmSendReactionMessageOperationValidator,
  dmSendEditMessageOperationValidator,
  dmAddMembersOperationValidator,
  dmJoinThreadOperationValidator,
  dmLeaveThreadOperationValidator,
  dmRemoveMembersOperationValidator,
  dmChangeThreadSettingsOperationValidator,
]);

export type DMOperationResult = {
  +rawMessageInfos: Array<RawMessageInfo>,
  +updateInfos: Array<ClientUpdateInfo>,
};

export const processDMOpsActionType = 'PROCESS_DM_OPS';

export type ProcessDMOpsPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
};

export const queueDMOpsActionType = 'QUEUE_DM_OPS';
export type QueueDMOpsPayload = {
  +operation: DMOperation,
  +threadID: string,
};

export const pruneDMOpsQueueActionType = 'PRUNE_DM_OPS_QUEUE';
export type PruneDMOpsQueuePayload = {
  +pruneMaxTime: number,
};

export const scheduleP2PMessagesActionType = 'SCHEDULE_P2P_MESSAGES';
export type ScheduleP2PMessagesPayload = {
  +dmOpID: string,
  +messages: $ReadOnlyArray<OutboundP2PMessage>,
};

export type QueuedDMOperations = {
  +operations: {
    +[threadID: string]: $ReadOnlyArray<DMOperation>,
  },
};
