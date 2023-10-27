// @flow

import type { ThreadStoreOperation } from '../../ops/thread-store-ops.js';
import type { RawEntryInfo } from '../../types/entry-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from '../../types/message-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type {
  ClientUpdateInfo,
  RawUpdateInfo,
  UpdateData,
} from '../../types/update-types.js';
import type { CurrentUserInfo, UserInfos } from '../../types/user-types.js';

export type UpdateSpec<
  UpdateInfo: ClientUpdateInfo,
  RawInfo: RawUpdateInfo,
  Data: UpdateData,
> = {
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
  +reduceCalendarThreadFilters?: (
    filteredThreadIDs: $ReadOnlySet<string>,
    update: UpdateInfo,
  ) => $ReadOnlySet<string>,
  +getRawMessageInfos?: (update: UpdateInfo) => $ReadOnlyArray<RawMessageInfo>,
  +mergeMessageInfosAndTruncationStatuses?: (
    messageIDs: Set<string>,
    messageInfos: Array<RawMessageInfo>,
    truncationStatuses: MessageTruncationStatuses,
    update: UpdateInfo,
  ) => void,
  +rawUpdateInfoFromRow: (row: Object) => RawInfo,
  +updateContentForServerDB: (data: Data) => ?string,
  +entitiesToFetch?: (update: RawInfo) => {
    +threadID?: string,
    +detailedThreadID?: string,
    +entryID?: string,
    +currentUser?: boolean,
  },
};
