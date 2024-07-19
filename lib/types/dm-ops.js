// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import type { RawMessageInfo } from './message-types.js';
import {
  type NonSidebarThickThreadType,
  nonSidebarThickThreadTypes,
} from './thread-types-enum.js';
import type { ClientUpdateInfo } from './update-types.js';
import { values } from '../utils/objects.js';
import { tShape, tString, tUserID } from '../utils/validation-utils.js';

export const dmOperationTypes = Object.freeze({
  CREATE_THREAD: 'create_thread',
  CREATE_SIDEBAR: 'create_sidebar',
  SEND_TEXT_MESSAGE: 'send_text_message',
  SEND_REACTION_MESSAGE: 'send_reaction_message',
  SEND_EDIT_MESSAGE: 'send_edit_message',
});
export type DMOperationType = $Values<typeof dmOperationTypes>;

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

export type DMOperation =
  | DMCreateThreadOperation
  | DMCreateSidebarOperation
  | DMSendTextMessageOperation
  | DMSendReactionMessageOperation
  | DMSendEditMessageOperation;
export const dmOperationValidator: TUnion<DMOperation> = t.union([
  dmCreateThreadOperationValidator,
  dmCreateSidebarOperationValidator,
  dmSendTextMessageOperationValidator,
  dmSendReactionMessageOperationValidator,
  dmSendEditMessageOperationValidator,
]);

export type DMOperationResult = {
  rawMessageInfos: Array<RawMessageInfo>,
  updateInfos: Array<ClientUpdateInfo>,
};

export const processDMOpsActionType = 'PROCESS_DM_OPS';

export type ProcessDMOpsPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
};
