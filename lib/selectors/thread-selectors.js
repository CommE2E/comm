// @flow

import _compact from 'lodash/fp/compact';
import _filter from 'lodash/fp/filter';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _mapValues from 'lodash/fp/mapValues';
import _orderBy from 'lodash/fp/orderBy';
import _some from 'lodash/fp/some';
import _sortBy from 'lodash/fp/sortBy';
import _memoize from 'lodash/memoize';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import { createEntryInfo } from '../shared/entry-utils';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils';
import {
  threadInHomeChatList,
  threadInBackgroundChatList,
  threadInFilterList,
  threadInfoFromRawThreadInfo,
  threadHasPermission,
  threadInChatList,
  threadHasAdminRole,
  roleIsAdminRole,
  threadIsPending,
  getLocallyUniqueThreadID,
} from '../shared/thread-utils';
import type { EntryInfo } from '../types/entry-types';
import type { MessageStore, RawMessageInfo } from '../types/message-types';
import type { BaseAppState } from '../types/redux-types';
import {
  type ThreadInfo,
  type RawThreadInfo,
  type RelativeMemberInfo,
  threadPermissions,
  threadTypes,
  type SidebarInfo,
} from '../types/thread-types';
import { dateString, dateFromString } from '../utils/date-utils';
import { values } from '../utils/objects';
import {
  filteredThreadIDsSelector,
  includeDeletedSelector,
} from './calendar-filter-selectors';
import { relativeMemberInfoSelectorForMembersOfThread } from './user-selectors';

const _mapValuesWithKeys = _mapValues.convert({ cap: false });

type ThreadInfoSelectorType = (
  state: BaseAppState<*>,
) => { +[id: string]: ThreadInfo };
const threadInfoSelector: ThreadInfoSelectorType = createObjectSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (threadInfo, threadInfos, currentUserInfoId, UserInfos) =>
    threadInfoFromRawThreadInfo(
      threadInfo,
      threadInfos[threadInfo.parentThreadID],
      currentUserInfoId,
      UserInfos,
    ),
);

const canBeOnScreenThreadInfos: (
  state: BaseAppState<*>,
) => $ReadOnlyArray<ThreadInfo> = createSelector(
  threadInfoSelector,
  (threadInfos: { +[id: string]: ThreadInfo }) => {
    const result = [];
    for (const threadID in threadInfos) {
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
) => $ReadOnlyArray<ThreadInfo> = createSelector(
  filteredThreadIDsSelector,
  canBeOnScreenThreadInfos,
  (
    inputThreadIDs: ?$ReadOnlySet<string>,
    threadInfos: $ReadOnlyArray<ThreadInfo>,
  ) => {
    const threadIDs = inputThreadIDs;
    if (!threadIDs) {
      return threadInfos;
    }
    return threadInfos.filter(threadInfo => threadIDs.has(threadInfo.id));
  },
);

const onScreenEntryEditableThreadInfos: (
  state: BaseAppState<*>,
) => $ReadOnlyArray<ThreadInfo> = createSelector(
  onScreenThreadInfos,
  (threadInfos: $ReadOnlyArray<ThreadInfo>) =>
    threadInfos.filter(threadInfo =>
      threadHasPermission(threadInfo, threadPermissions.EDIT_ENTRIES),
    ),
);

const entryInfoSelector: (
  state: BaseAppState<*>,
) => { +[id: string]: EntryInfo } = createObjectSelector(
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  createEntryInfo,
);

// "current" means within startDate/endDate range, not deleted, and in
// onScreenThreadInfos
const currentDaysToEntries: (
  state: BaseAppState<*>,
) => { +[dayString: string]: EntryInfo[] } = createSelector(
  entryInfoSelector,
  (state: BaseAppState<*>) => state.entryStore.daysToEntries,
  (state: BaseAppState<*>) => state.navInfo.startDate,
  (state: BaseAppState<*>) => state.navInfo.endDate,
  onScreenThreadInfos,
  includeDeletedSelector,
  (
    entryInfos: { +[id: string]: EntryInfo },
    daysToEntries: { +[day: string]: string[] },
    startDateString: string,
    endDateString: string,
    onScreen: $ReadOnlyArray<ThreadInfo>,
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
) => { +[id: string]: $ReadOnlyArray<ThreadInfo> } = createSelector(
  threadInfoSelector,
  (threadInfos: { +[id: string]: ThreadInfo }) => {
    const result = {};
    for (const id in threadInfos) {
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

function getMostRecentRawMessageInfo(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
): ?RawMessageInfo {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return null;
  }
  for (const messageID of thread.messageIDs) {
    return messageStore.messages[messageID];
  }
  return null;
}

const sidebarInfoSelector: (
  state: BaseAppState<*>,
) => { +[id: string]: $ReadOnlyArray<SidebarInfo> } = createObjectSelector(
  childThreadInfos,
  (state: BaseAppState<*>) => state.messageStore,
  (childThreads: $ReadOnlyArray<ThreadInfo>, messageStore: MessageStore) => {
    const sidebarInfos = [];
    for (const childThreadInfo of childThreads) {
      if (
        !threadInChatList(childThreadInfo) ||
        childThreadInfo.type !== threadTypes.SIDEBAR
      ) {
        continue;
      }
      const mostRecentRawMessageInfo = getMostRecentRawMessageInfo(
        childThreadInfo,
        messageStore,
      );
      const lastUpdatedTime =
        mostRecentRawMessageInfo?.time ?? childThreadInfo.creationTime;
      const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
        childThreadInfo.id,
        messageStore,
      );
      sidebarInfos.push({
        threadInfo: childThreadInfo,
        lastUpdatedTime,
        mostRecentNonLocalMessage,
      });
    }
    return _orderBy('lastUpdatedTime')('desc')(sidebarInfos);
  },
);

const unreadCount: (state: BaseAppState<*>) => number = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (threadInfos: { +[id: string]: RawThreadInfo }): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInHomeChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const unreadBackgroundCount: (
  state: BaseAppState<*>,
) => number = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (threadInfos: { +[id: string]: RawThreadInfo }): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInBackgroundChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const baseAncestorThreadInfos = (threadID: string) =>
  createSelector(
    (state: BaseAppState<*>) => threadInfoSelector(state),
    (threadInfos: {
      +[id: string]: ThreadInfo,
    }): $ReadOnlyArray<ThreadInfo> => {
      const pathComponents: ThreadInfo[] = [];
      let node: ?ThreadInfo = threadInfos[threadID];
      while (node) {
        pathComponents.push(node);
        node = node.parentThreadID ? threadInfos[node.parentThreadID] : null;
      }
      pathComponents.reverse();
      return pathComponents;
    },
  );

const ancestorThreadInfos: (
  threadID: string,
) => (state: BaseAppState<*>) => $ReadOnlyArray<ThreadInfo> = _memoize(
  baseAncestorThreadInfos,
);

const baseOtherUsersButNoOtherAdmins = (threadID: string) =>
  createSelector(
    (state: BaseAppState<*>) => state.threadStore.threadInfos[threadID],
    relativeMemberInfoSelectorForMembersOfThread(threadID),
    (
      threadInfo: ?RawThreadInfo,
      members: $ReadOnlyArray<RelativeMemberInfo>,
    ): boolean => {
      if (!threadInfo) {
        return false;
      }
      if (!threadHasAdminRole(threadInfo)) {
        return false;
      }
      let otherUsersExist = false;
      let otherAdminsExist = false;
      for (const member of members) {
        const role = member.role;
        if (role === undefined || role === null || member.isViewer) {
          continue;
        }
        otherUsersExist = true;
        if (roleIsAdminRole(threadInfo?.roles[role])) {
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
  threadInfos: { +[id: string]: RawThreadInfo },
): ?string {
  let mostRecent = null;
  for (const threadID in threadInfos) {
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
    if (mostRecent && mostRecent.time >= mostRecentMessageTime) {
      continue;
    }

    const topLevelThreadID =
      threadInfo.type === threadTypes.SIDEBAR
        ? threadInfo.parentThreadID
        : threadID;
    mostRecent = { threadID: topLevelThreadID, time: mostRecentMessageTime };
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

const threadInfoFromSourceMessageIDSelector: (
  state: BaseAppState<*>,
) => { +[id: string]: ThreadInfo } = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  threadInfoSelector,
  (
    rawThreadInfos: { +[id: string]: RawThreadInfo },
    threadInfos: { +[id: string]: ThreadInfo },
  ) => {
    const locallyUniqueToRealizedThreadIDs = locallyUniqueToRealizedThreadIDsSelector(
      rawThreadInfos,
    );
    const result = {};
    for (const realizedID of locallyUniqueToRealizedThreadIDs.values()) {
      const threadInfo = threadInfos[realizedID];
      if (threadInfo && threadInfo.sourceMessageID) {
        result[threadInfo.sourceMessageID] = threadInfo;
      }
    }
    return result;
  },
);
const locallyUniqueToRealizedThreadIDsSelector: (rawThreadInfos: {
  +[id: string]: RawThreadInfo,
}) => $ReadOnlyMap<string, string> = createSelector(
  (rawThreadInfos: { +[id: string]: RawThreadInfo }) => rawThreadInfos,
  (rawThreadInfos: { +[id: string]: RawThreadInfo }) => {
    const result = new Map();
    for (const threadID in rawThreadInfos) {
      const rawThreadInfo = rawThreadInfos[threadID];
      if (threadIsPending(threadID)) {
        continue;
      }
      const actualMemberIDs = rawThreadInfo.members
        .filter(member => member.role)
        .map(member => member.id);
      const locallyUniqueThreadID = getLocallyUniqueThreadID(
        rawThreadInfo.type,
        actualMemberIDs,
        rawThreadInfo.sourceMessageID,
      );
      const existingResult = result.get(locallyUniqueThreadID);
      if (
        !existingResult ||
        rawThreadInfos[existingResult].creationTime > rawThreadInfo.creationTime
      ) {
        result.set(locallyUniqueThreadID, threadID);
      }
    }
    return result;
  },
);

export {
  ancestorThreadInfos,
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
  sidebarInfoSelector,
  threadInfoFromSourceMessageIDSelector,
  locallyUniqueToRealizedThreadIDsSelector,
};
