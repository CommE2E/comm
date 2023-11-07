// @flow

import type { TType } from 'tcomb';

import type { ThreadStoreOperation } from '../../ops/thread-store-ops.js';
import type {
  FetchEntryInfosBase,
  RawEntryInfo,
  RawEntryInfos,
} from '../../types/entry-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  FetchMessageInfosResult,
} from '../../types/message-types.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { UpdateType } from '../../types/update-types-enum.js';
import type {
  ClientUpdateInfo,
  RawUpdateInfo,
  UpdateData,
} from '../../types/update-types.js';
import type {
  CurrentUserInfo,
  LoggedInUserInfo,
  UserInfos,
} from '../../types/user-types.js';

export type UpdateInfosRawData = {
  +threadInfos: RawThreadInfos,
  +messageInfosResult: ?FetchMessageInfosResult,
  +calendarResult: ?FetchEntryInfosBase,
  +entryInfosResult: ?RawEntryInfos,
  +currentUserInfoResult: LoggedInUserInfo,
  +userInfosResult: ?UserInfos,
};

export type UpdateInfoFromRawInfoParams = {
  +data: UpdateInfosRawData,
  +rawEntryInfosByThreadID: {
    +[id: string]: $ReadOnlyArray<RawEntryInfo>,
  },
  +rawMessageInfosByThreadID: {
    +[id: string]: $ReadOnlyArray<RawMessageInfo>,
  },
};

export type UpdateTypes = 'all_types' | $ReadOnlySet<UpdateType>;

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
    +userID?: string,
  },
  +updateInfoFromRawInfo: (
    info: RawInfo,
    params: UpdateInfoFromRawInfoParams,
  ) => ?UpdateInfo,
  +deleteCondition: ?UpdateTypes,
  +keyForUpdateData?: (data: Data) => string,
  +typesOfReplacedUpdatesForMatchingKey: ?UpdateTypes,
  +infoValidator: TType<UpdateInfo>,
};
