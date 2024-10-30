// @flow

import type { TInterface } from 'tcomb';

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawEntryInfos } from '../../types/entry-types.js';
import type { UserIdentitiesResponse } from '../../types/identity-service-types.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { ThickRawThreadInfos } from '../../types/thread-types.js';

export type ProcessDMOperationUtilities = {
  +viewerID: string,
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
  +threadInfos: ThickRawThreadInfos,
  +entryInfos: RawEntryInfos,
  +findUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>,
};

export type ProcessingPossibilityCheckResult =
  | { +isProcessingPossible: true }
  | {
      +isProcessingPossible: false,
      +reason:
        | { +type: 'missing_thread', +threadID: string }
        | { +type: 'missing_entry', +entryID: string }
        | { +type: 'missing_message', +messageID: string }
        | { +type: 'missing_membership', +threadID: string, +userID: string }
        | { +type: 'invalid' },
    };

export type DMOperationSpec<DMOp: DMOperation> = {
  +processDMOperation: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<DMOperationResult>,
  +canBeProcessed: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<ProcessingPossibilityCheckResult>,
  +supportsAutoRetry: boolean,
  +operationValidator: TInterface<DMOp>,
};
