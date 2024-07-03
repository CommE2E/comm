// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type { RawMessageInfo } from './message-types.js';
import { type ThickThreadType, thickThreadTypes } from './thread-types-enum.js';
import type { ClientUpdateInfo } from './update-types.js';
import { values } from '../utils/objects.js';
import { tShape, tString, tUserID } from '../utils/validation-utils.js';

export const dmOperationTypes = Object.freeze({
  CREATE_THREAD: 'create_thread',
  SEND_TEXT_MESSAGE: 'send_text_message',
});
export type DMOperationType = $Values<typeof dmOperationTypes>;

export type DMCreateThreadOperation = {
  +type: 'create_thread',
  +threadID: string,
  +creatorID: string,
  +time: number,
  +threadType: ThickThreadType,
  +parentThreadID?: ?string,
  +memberIDs: $ReadOnlyArray<string>,
  +sourceMessageID?: ?string,
};
export const dmCreateThreadOperationValidator: TInterface<DMCreateThreadOperation> =
  tShape<DMCreateThreadOperation>({
    type: tString(dmOperationTypes.CREATE_THREAD),
    threadID: t.String,
    creatorID: tUserID,
    time: t.Number,
    threadType: t.enums.of(values(thickThreadTypes)),
    parentThreadID: t.maybe(t.String),
    memberIDs: t.list(tUserID),
    sourceMessageID: t.maybe(t.String),
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

export type DMOperation = DMCreateThreadOperation | DMSendTextMessageOperation;

export type DMOperationResult = {
  rawMessageInfos: Array<RawMessageInfo>,
  updateInfos: Array<ClientUpdateInfo>,
};
