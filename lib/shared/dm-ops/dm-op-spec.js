// @flow

import type { TInterface } from 'tcomb';

import type { DMOperation, DMOperationResult } from '../../types/dm-ops.js';
import type { RawEntryInfos } from '../../types/entry-types.js';
import type { UserIdentitiesResponse } from '../../types/identity-service-types.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { ThickRawThreadInfos } from '../../types/thread-types.js';
import type { UserInfos } from '../../types/user-types.js';
import type { GetENSNames } from '../../utils/ens-helpers.js';
import type { GetFCNames } from '../../utils/farcaster-helpers.js';
import type { ParserRules } from '../markdown.js';

export type ProcessDMOperationUtilities = {
  +viewerID: string,
  +fetchMessage: (messageID: string) => Promise<?RawMessageInfo>,
  +rawThreadInfos: ThickRawThreadInfos,
  +threadInfos: { +[id: string]: ThreadInfo },
  +entryInfos: RawEntryInfos,
  +findUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>,
  +userInfos: UserInfos,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
  +markdownRules: ParserRules,
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
