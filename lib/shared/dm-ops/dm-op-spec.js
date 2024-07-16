// @flow

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { BaseAction } from '../../types/redux-types.js';

export type ProcessDMOperationUtilities = {
  // Needed to fetch sidebar source messages
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
};

export type DMOperationSpecification<DMOp: DMOperation> = {
  +op: DMOp,
  +supportsAutoRetry: boolean,
  +recipients: 'all_peer_devices' | 'self_devices',
};

export type DMOperationSpec<DMOp: DMOperation> = {
  +processDMOperation: (
    dmOp: DMOp,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<DMOperationResult>,
  +fromAction: (action: BaseAction) => ?DMOperationSpecification<DMOp>,
};
