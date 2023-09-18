// @flow

import type { ThreadStoreOperation } from '../../ops/thread-store-ops.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

export type UpdateSpec<UpdateInfo: ClientUpdateInfo> = {
  +generateOpsForThreadUpdates?: (
    storeThreadInfos: RawThreadInfos,
    update: UpdateInfo,
  ) => ?$ReadOnlyArray<ThreadStoreOperation>,
};
