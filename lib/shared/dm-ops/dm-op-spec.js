// @flow

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawMessageInfo, MessageData } from '../../types/message-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';

export type ProcessDMOperationUtilities = {
  // Needed to fetch sidebar source messages
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
  +threadInfos: RawThreadInfos,
};

export type DMOperationSpec<DMOp: DMOperation> = {
  +messageDataFromDMOperation: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<$ReadOnlyArray<MessageData>>,
  +processDMOperation: (
    dmOp: DMOp,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<DMOperationResult>,
  +canBeProcessed: (
    dmOp: DMOp,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) =>
    | { +isProcessingPossible: true }
    | {
        +isProcessingPossible: false,
        +reason:
          | { +type: 'missing_thread', +threadID: string }
          | { +type: 'invalid' },
      },
};
