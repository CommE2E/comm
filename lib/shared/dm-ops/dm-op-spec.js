// @flow

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawMessageInfo } from '../../types/message-types.js';

export type ProcessDMOperationUtilities = {
  // Needed to fetch sidebar source messages
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
};

export type DMOperationSpec<DMOp: DMOperation> = {
  +processDMOperation: (
    dmOp: DMOp,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<DMOperationResult>,
};
