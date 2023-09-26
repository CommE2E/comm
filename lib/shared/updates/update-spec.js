// @flow

import type { ThreadStoreOperation } from '../../ops/thread-store-ops.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import type { CurrentUserInfo, UserInfos } from '../../types/user-types.js';

export type UpdateSpec<UpdateInfo: ClientUpdateInfo> = {
  +generateOpsForThreadUpdates?: (
    storeThreadInfos: RawThreadInfos,
    update: UpdateInfo,
  ) => ?$ReadOnlyArray<ThreadStoreOperation>,
  +mergeEntryInfos?: (
    entryIDs: Set<string>,
    mergedEntryInfos: Array<RawEntryInfo>,
    update: UpdateInfo,
  ) => void,
  +reduceCurrentUser?: (
    state: ?CurrentUserInfo,
    update: UpdateInfo,
  ) => ?CurrentUserInfo,
  +reduceUserInfos?: (state: UserInfos, update: UpdateInfo) => UserInfos,
};
