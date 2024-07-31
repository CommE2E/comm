// @flow

import type { MessageData } from './message-types.js';
import type { StoreOperations } from './store-ops-types.js';

export type MessageSourceMetadata = {
  +messageID: string,
  +senderDeviceID: string,
};

export type DBOpsEntry =
  | {
      +messageSourceMetadata: MessageSourceMetadata,
      +ops?: ?StoreOperations,
      +notificationsMessageDatas?: $ReadOnlyArray<MessageData>,
    }
  | {
      +ops: StoreOperations,
      +dmOpID?: string,
      +notificationsMessageDatas?: $ReadOnlyArray<MessageData>,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
