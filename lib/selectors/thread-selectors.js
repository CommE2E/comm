// @flow

import type { BaseAppState } from '../types/redux-types';
import {
  type ThreadInfo,
  type RawThreadInfo,
  type RelativeMemberInfo,
  threadPermissions,
} from '../types/thread-types';
import type { EntryInfo } from '../types/entry-types';
import type { MessageStore } from '../types/message-types';

import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';
import _flow from 'lodash/fp/flow';
import _some from 'lodash/fp/some';
import _mapValues from 'lodash/fp/mapValues';
import _map from 'lodash/fp/map';
import _compact from 'lodash/fp/compact';
import _filter from 'lodash/fp/filter';
import _sortBy from 'lodash/fp/sortBy';
import _memoize from 'lodash/memoize';
import _find from 'lodash/fp/find';
const _mapValuesWithKeys = _mapValues.convert({ cap: false });

import { dateString, dateFromString } from '../utils/date-utils';
import { values } from '../utils/objects';
import { createEntryInfo } from '../shared/entry-utils';
import {
  threadInHomeChatList,
  threadInBackgroundChatList,
  threadInFilterList,
  threadInfoFromRawThreadInfo,
  threadHasPermission,
} from '../shared/thread-utils';
import { relativeMemberInfoSelectorForMembersOfThread } from './user-selectors';
import {
  filteredThreadIDsSelector,
  includeDeletedSelector,
} from './calendar-filter-selectors';

type ThreadInfoSelectorType = (
  state: BaseAppState<*>,
) => { [id: string]: ThreadInfo };
const threadInfoSelector: ThreadInfoSelectorType = createObjectSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  threadInfoFromRawThreadInfo,
);

const canBeOnScreenThreadInfos: (
  state: BaseAppState<*>,
) => ThreadInfo[] = createSelector(
  threadInfoSelector,
  (threadInfos: { [id: string]: ThreadInfo }) => {
    const result = [];
    for (let threadID in threadInfos) {
      const threadInfo = threadInfos[threadID];
      if (!threadInFilterList(threadInfo)) {
        continue;
      }
      result.push(threadInfo);
    }
    return result;
  },
);

const onScreenThreadInfos: (
  state: BaseAppState<*>,
) => ThreadInfo[] = createSelector(
  filteredThreadIDsSelector,
  canBeOnScreenThreadInfos,
  (inputThreadIDs: ?Set<string>, threadInfos: ThreadInfo[]) => {
    const threadIDs = inputThreadIDs;
    if (!threadIDs) {
      return threadInfos;
    }
    return threadInfos.filter(threadInfo => threadIDs.has(threadInfo.id));
  },
);

const onScreenEntryEditableThreadInfos: (
  state: BaseAppState<*>,
) => ThreadInfo[] = createSelector(
  onScreenThreadInfos,
  (threadInfos: ThreadInfo[]) =>
    threadInfos.filter(threadInfo =>
      threadHasPermission(threadInfo, threadPermissions.EDIT_ENTRIES),
    ),
);

const entryInfoSelector: (
  state: BaseAppState<*>,
) => { [id: string]: EntryInfo } = createObjectSelector(
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  createEntryInfo,
);

// "current" means within startDate/endDate range, not deleted, and in
// onScreenThreadInfos
const currentDaysToEntries: (
  state: BaseAppState<*>,
) => { [dayString: string]: EntryInfo[] } = createSelector(
  entryInfoSelector,
  (state: BaseAppState<*>) => state.entryStore.daysToEntries,
  (state: BaseAppState<*>) => state.navInfo.startDate,
  (state: BaseAppState<*>) => state.navInfo.endDate,
  onScreenThreadInfos,
  includeDeletedSelector,
  (
    entryInfos: { [id: string]: EntryInfo },
    daysToEntries: { [day: string]: string[] },
    startDateString: string,
    endDateString: string,
    onScreen: ThreadInfo[],
    includeDeleted: boolean,
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
    return _mapValuesWithKeys((_: string[], dayString: string) =>
      _flow(
        _map((entryID: string) => entryInfos[entryID]),
        _compact,
        _filter(
          (entryInfo: EntryInfo) =>
            (includeDeleted || !entryInfo.deleted) &&
            _some(['id', entryInfo.threadID])(onScreen),
        ),
        _sortBy('creationTime'),
      )(daysToEntries[dayString] ? daysToEntries[dayString] : []),
    )(allDaysWithinRange);
  },
);

const childThreadInfos: (
  state: BaseAppState<*>,
) => { [id: string]: ThreadInfo[] } = createSelector(
  threadInfoSelector,
  (threadInfos: { [id: string]: ThreadInfo }) => {
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

const unreadCount: (state: BaseAppState<*>) => number = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (threadInfos: { [id: string]: RawThreadInfo }): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInHomeChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const unreadBackgroundCount: (
  state: BaseAppState<*>,
) => number = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (threadInfos: { [id: string]: RawThreadInfo }): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInBackgroundChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const baseOtherUsersButNoOtherAdmins = (threadID: string) =>
  createSelector(
    (state: BaseAppState<*>) => state.threadStore.threadInfos[threadID],
    relativeMemberInfoSelectorForMembersOfThread(threadID),
    (threadInfo: ?RawThreadInfo, members: RelativeMemberInfo[]): boolean => {
      if (!threadInfo) {
        return false;
      }
      if (!_find({ name: 'Admins' })(threadInfo.roles)) {
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
        if (threadInfo.roles[role].name === 'Admins') {
          otherAdminsExist = true;
          break;
        }
      }
      return otherUsersExist && !otherAdminsExist;
    },
  );

const otherUsersButNoOtherAdmins: (
  threadID: string,
) => (state: BaseAppState<*>) => boolean = _memoize(
  baseOtherUsersButNoOtherAdmins,
);

function mostRecentReadThread(
  messageStore: MessageStore,
  threadInfos: { [id: string]: RawThreadInfo },
): ?string {
  let mostRecent = null;
  for (let threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    if (threadInfo.currentUser.unread) {
      continue;
    }
    const threadMessageInfo = messageStore.threads[threadID];
    if (!threadMessageInfo) {
      continue;
    }
    const mostRecentMessageTime =
      threadMessageInfo.messageIDs.length === 0
        ? threadInfo.creationTime
        : messageStore.messages[threadMessageInfo.messageIDs[0]].time;
    if (!mostRecent || mostRecent.time < mostRecentMessageTime) {
      mostRecent = { threadID, time: mostRecentMessageTime };
    }
  }
  return mostRecent ? mostRecent.threadID : null;
}

const mostRecentReadThreadSelector: (
  state: BaseAppState<*>,
) => ?string = createSelector(
  (state: BaseAppState<*>) => state.messageStore,
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  mostRecentReadThread,
);

export {
  threadInfoSelector,
  onScreenThreadInfos,
  onScreenEntryEditableThreadInfos,
  entryInfoSelector,
  currentDaysToEntries,
  childThreadInfos,
  unreadCount,
  unreadBackgroundCount,
  otherUsersButNoOtherAdmins,
  mostRecentReadThread,
  mostRecentReadThreadSelector,
};
