// @flow

import type { RawMessageInfo } from '../../types/message-types.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

export const processFarcasterOpsActionType = 'PROCESS_FARCASTER_OPS';

export type ProcessFarcasterOpsPayload = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
};
