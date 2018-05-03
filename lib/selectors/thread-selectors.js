// @flow

import type { BaseAppState } from '../types/redux-types';
import {
  type ThreadInfo,
  type RawThreadInfo,
  type RelativeMemberInfo,
  threadPermissions,
} from '../types/thread-types';
import type { RawEntryInfo, EntryInfo } from '../types/entry-types';
import type { UserInfo } from '../types/user-types';

import { createSelector } from 'reselect';
import _flow from 'lodash/fp/flow';
import _some from 'lodash/fp/some';
import _mapValues from 'lodash/fp/mapValues';
import _map from 'lodash/fp/map';
import _compact from 'lodash/fp/compact';
import _filter from 'lodash/fp/filter';
import _sortBy from 'lodash/fp/sortBy';
import _size from 'lodash/fp/size';
import _memoize from 'lodash/memoize';
import _find from 'lodash/fp/find';
const _mapValuesWithKeys = _mapValues.convert({ cap: false });

import { currentNavID } from './nav-selectors';
import { dateString, dateFromString } from '../utils/date-utils';
import { createEntryInfo } from '../shared/entry-utils';
import {
  viewerIsMember,
  threadInfoFromRawThreadInfo,
  threadHasPermission,
} from '../shared/thread-utils';
import { relativeMemberInfoSelectorForMembersOfThread } from './user-selectors';
import {
  filteredThreadIDsSelector,
  activeFilterThreadID,
} from './calendar-filter-selectors';

const rawThreadInfosToThreadInfos = (
  rawThreadInfos: {[id: string]: RawThreadInfo},
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): {[id: string]: ThreadInfo} => _mapValues(
  (rawThreadInfo: RawThreadInfo) => threadInfoFromRawThreadInfo(
    rawThreadInfo,
    viewerID,
    userInfos,
  ),
)(rawThreadInfos);

type ThreadInfoSelectorType =
  (state: BaseAppState<*>) => {[id: string]: ThreadInfo};
const threadInfoSelector: ThreadInfoSelectorType = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  rawThreadInfosToThreadInfos,
);

const memberThreadInfos = createSelector(
  threadInfoSelector,
  (threadInfos: {[id: string]: ThreadInfo}) => {
    const result = [];
    for (let threadID in threadInfos) {
      const threadInfo = threadInfos[threadID];
      if (!viewerIsMember(threadInfo)) {
        continue;
      }
      result.push(threadInfo);
    }
    return result;
  },
);

const onScreenThreadInfos = createSelector(
  filteredThreadIDsSelector,
  memberThreadInfos,
  (
    inputThreadIDs: ?Set<string>,
    threadInfos: ThreadInfo[],
  ) => {
    const threadIDs = inputThreadIDs;
    if (!threadIDs) {
      return threadInfos;
    }
    return threadInfos.filter(
      threadInfo => threadIDs.has(threadInfo.id),
    );
  },
);

const onScreenEntryEditableThreadInfos = createSelector(
  onScreenThreadInfos,
  (threadInfos: ThreadInfo[]) => threadInfos.filter(
    threadInfo => threadHasPermission(
      threadInfo,
      threadPermissions.EDIT_ENTRIES,
    ),
  ),
);

const typeaheadSortedThreadInfos = createSelector(
  threadInfoSelector,
  currentNavID,
  activeFilterThreadID,
  (
    threadInfos: {[id: string]: ThreadInfo},
    currentNavID: ?string,
    currentThreadID: ?string,
  ) => {
    const currentInfos = [];
    const memberInfos = [];
    const recommendedInfos = [];
    for (const threadID: string in threadInfos) {
      if (threadID === currentNavID) {
        continue;
      }
      const threadInfo = threadInfos[threadID];
      if (!currentNavID && threadID === currentThreadID) {
        currentInfos.push(threadInfo);
      } else if (viewerIsMember(threadInfo)) {
        memberInfos.push(threadInfo);
      } else {
        recommendedInfos.push(threadInfo);
      }
    }
    return {
      current: currentInfos,
      member: memberInfos,
      recommended: recommendedInfos,
    };
  },
);

// "current" means within startDate/endDate range, not deleted, and in
// onScreenThreadInfos
const currentDaysToEntries = createSelector(
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (state: BaseAppState<*>) => state.entryStore.daysToEntries,
  (state: BaseAppState<*>) => state.navInfo.startDate,
  (state: BaseAppState<*>) => state.navInfo.endDate,
  (state: BaseAppState<*>) => state.userInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  onScreenThreadInfos,
  (
    entryInfos: {[id: string]: RawEntryInfo},
    daysToEntries: {[day: string]: string[]},
    startDateString: string,
    endDateString: string,
    userInfos: {[id: string]: UserInfo},
    viewerID: ?string,
    onScreenThreadInfos: ThreadInfo[],
  ) => {
    const allDaysWithinRange = {},
      startDate = dateFromString(startDateString),
      endDate = dateFromString(endDateString);
    for (
      const curDate = startDate;
      curDate <= endDate;
      curDate.setDate(curDate.getDate() + 1)
    ) {
      allDaysWithinRange[dateString(curDate)] = [];
    }
    return _mapValuesWithKeys(
      (_: string[], dayString: string) => _flow(
        _map(
          (entryID: string) =>
            createEntryInfo(entryInfos[entryID], viewerID, userInfos),
        ),
        _compact,
        _filter(
          (entryInfo: EntryInfo) => !entryInfo.deleted &&
            _some(['id', entryInfo.threadID])(onScreenThreadInfos),
        ),
        _sortBy("creationTime"),
      )(daysToEntries[dayString] ? daysToEntries[dayString] : []),
    )(allDaysWithinRange);
  },
);

const childThreadInfos = createSelector(
  threadInfoSelector,
  (threadInfos: {[id: string]: ThreadInfo}): {[id: string]: ThreadInfo[]} => {
    const result = {};
    for (let id in threadInfos) {
      const threadInfo = threadInfos[id];
      const parentThreadID = threadInfo.parentThreadID;
      if (parentThreadID === null || parentThreadID === undefined) {
        continue;
      }
      if (result[parentThreadID] === undefined) {
        result[parentThreadID] = [];
      }
      result[parentThreadID].push(threadInfo);
    }
    return result;
  },
);

const unreadCount = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  (threadInfos: {[id: string]: RawThreadInfo}): number => _flow(
    _filter(viewerIsMember),
    _filter('currentUser.unread'),
    _size,
  )(threadInfos),
);

const baseOtherUsersButNoOtherAdmins = (threadID: string) => createSelector(
  (state: BaseAppState<*>) => state.threadInfos[threadID],
  relativeMemberInfoSelectorForMembersOfThread(threadID),
  (threadInfo: ?RawThreadInfo, members: RelativeMemberInfo[]): bool => {
    if (!threadInfo) {
      return false;
    }
    if (!_find({ name: "Admins" })(threadInfo.roles)) {
      return false;
    }
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (let member of members) {
      const role = member.role;
      if (role === undefined || role === null || member.isViewer) {
        continue;
      }
      otherUsersExist = true;
      if (threadInfo.roles[role].name === "Admins") {
        otherAdminsExist = true;
        break;
      }
    }
    return otherUsersExist && !otherAdminsExist;
  },
);

const otherUsersButNoOtherAdmins = _memoize(baseOtherUsersButNoOtherAdmins);

export {
  rawThreadInfosToThreadInfos,
  threadInfoSelector,
  memberThreadInfos,
  onScreenThreadInfos,
  onScreenEntryEditableThreadInfos,
  typeaheadSortedThreadInfos,
  currentDaysToEntries,
  childThreadInfos,
  unreadCount,
  otherUsersButNoOtherAdmins,
}
