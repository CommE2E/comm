// @flow

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawEntryInfos } from '../../types/entry-types.js';
import type { UserIdentitiesResponse } from '../../types/identity-service-types.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { NotificationsCreationData } from '../../types/notif-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';

export type ProcessDMOperationUtilities = {
  +viewerID: string,
  // Needed to fetch sidebar source messages
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
  +threadInfos: RawThreadInfos,
  +entryInfos: RawEntryInfos,
  +findUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>,
};

type ProcessingPossibilityCheckResult =
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
  +notificationsCreationData?: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<NotificationsCreationData>,
  +processDMOperation: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<DMOperationResult>,
  +canBeProcessed: (
    dmOp: DMOp,
    utilities: ProcessDMOperationUtilities,
  ) => Promise<ProcessingPossibilityCheckResult>,
  +supportsAutoRetry: boolean,
};
