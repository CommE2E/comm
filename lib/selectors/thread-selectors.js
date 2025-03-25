// @flow

import _compact from 'lodash/fp/compact.js';
import _filter from 'lodash/fp/filter.js';
import _flow from 'lodash/fp/flow.js';
import _groupBy from 'lodash/fp/groupBy.js';
import _map from 'lodash/fp/map.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _some from 'lodash/fp/some.js';
import _sortBy from 'lodash/fp/sortBy.js';
import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import {
  filteredThreadIDsSelector,
  includeDeletedSelector,
} from './calendar-filter-selectors.js';
import { relativeMemberInfoSelectorForMembersOfThread } from './user-selectors.js';
import genesis from '../facts/genesis.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import {
  getAvatarForThread,
  getRandomDefaultEmojiAvatar,
} from '../shared/avatar-utils.js';
import { createEntryInfo } from '../shared/entry-utils.js';
import {
  threadInHomeChatList,
  threadInBackgroundChatList,
  threadInFilterList,
  threadInfoFromRawThreadInfo,
  threadHasAdminRole,
  roleIsAdminRole,
  threadIsPending,
  getPendingThreadID,
} from '../shared/thread-utils.js';
import type { ClientAvatar, ClientEmojiAvatar } from '../types/avatar-types';
import type { EntryInfo } from '../types/entry-types.js';
import type { MessageStore } from '../types/message-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
  RawThreadInfo,
  ThickRawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import {
  threadTypeIsThick,
  threadTypeIsCommunityRoot,
  type ThreadType,
  threadTypes,
  threadTypeIsSidebar,
  threadTypeIsPrivate,
  threadTypeIsPersonal,
  personalThreadTypes,
  privateThreadTypes,
  sidebarThreadTypes,
} from '../types/thread-types-enum.js';
import type {
  MixedRawThreadInfos,
  RawThreadInfos,
  ThickRawThreadInfos,
} from '../types/thread-types.js';
import { dateString, dateFromString } from '../utils/date-utils.js';
import { values } from '../utils/objects.js';

const _mapValuesWithKeys = _mapValues.convert({ cap: false });

type ThreadInfoSelectorType = (state: BaseAppState<>) => {
  +[id: string]: ThreadInfo,
};
const threadInfoSelector: ThreadInfoSelectorType = createObjectSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<>) => state.userStore.userInfos,
  threadInfoFromRawThreadInfo,
);

const communityThreadSelector: (
  state: BaseAppState<>,
) => $ReadOnlyArray<ThreadInfo> = createSelector(
  threadInfoSelector,
  (threadInfos: { +[id: string]: ThreadInfo }) => {
    const result = [];
    for (const threadID in threadInfos) {
      const threadInfo = threadInfos[threadID];
      if (!threadTypeIsCommunityRoot(threadInfo.type)) {
        continue;
      }
      result.push(threadInfo);
    }
    return result;
  },
);

const canBeOnScreenThreadInfos: (
  state: BaseAppState<>,
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
  state: BaseAppState<>,
) => $ReadOnlyArray<ThreadInfo> = createSelector(
  filteredThreadIDsSelector,
  canBeOnScreenThreadInfos,
  (
    inputThreadIDs: ?$ReadOnlySet<string>,
    threadInfos: $ReadOnlyArray<ThreadInfo>,
  ): $ReadOnlyArray<ThreadInfo> => {
    const threadIDs = inputThreadIDs;
    if (!threadIDs) {
      return threadInfos;
    }
    return threadInfos.filter(threadInfo => threadIDs.has(threadInfo.id));
  },
);

const entryInfoSelector: (state: BaseAppState<>) => {
  +[id: string]: EntryInfo,
} = createObjectSelector(
  (state: BaseAppState<>) => state.entryStore.entryInfos,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<>) => state.userStore.userInfos,
  createEntryInfo,
);

// "current" means within startDate/endDate range, not deleted, and in
// onScreenThreadInfos
const currentDaysToEntries: (state: BaseAppState<>) => {
  +[dayString: string]: EntryInfo[],
} = createSelector(
  entryInfoSelector,
  (state: BaseAppState<>) => state.entryStore.daysToEntries,
  (state: BaseAppState<>) => state.navInfo.startDate,
  (state: BaseAppState<>) => state.navInfo.endDate,
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
    const allDaysWithinRange: { [string]: string[] } = {},
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

function getChildThreads<T: RawThreadInfo | ThreadInfo>(threadInfos: {
  +[id: string]: T,
}): { +[id: string]: Array<T> } {
  const result: {
    [string]: T[],
  } = {};
  for (const id in threadInfos) {
    const threadInfo = threadInfos[id];
    const parentThreadID = threadInfo.parentThreadID;
    if (parentThreadID === null || parentThreadID === undefined) {
      continue;
    }
    if (result[parentThreadID] === undefined) {
      result[parentThreadID] = ([]: T[]);
    }
    result[parentThreadID].push(threadInfo);
  }
  return result;
}

const childThreadInfos: (state: BaseAppState<>) => {
  +[id: string]: $ReadOnlyArray<ThreadInfo>,
} = createSelector(threadInfoSelector, getChildThreads);

const containedThreadInfos: (state: BaseAppState<>) => {
  +[id: string]: $ReadOnlyArray<ThreadInfo>,
} = createSelector(
  threadInfoSelector,
  (threadInfos: { +[id: string]: ThreadInfo }) => {
    const result: {
      [string]: ThreadInfo[],
    } = {};
    for (const id in threadInfos) {
      const threadInfo = threadInfos[id];
      const { containingThreadID } = threadInfo;
      if (containingThreadID === null || containingThreadID === undefined) {
        continue;
      }
      if (result[containingThreadID] === undefined) {
        result[containingThreadID] = ([]: ThreadInfo[]);
      }
      result[containingThreadID].push(threadInfo);
    }
    return result;
  },
);

const thickRawThreadInfosSelector: (
  state: BaseAppState<>,
) => ThickRawThreadInfos = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (threadInfos: RawThreadInfos): ThickRawThreadInfos => {
    const thickRawThreadInfos: { [id: string]: ThickRawThreadInfo } = {};
    for (const id in threadInfos) {
      const threadInfo = threadInfos[id];
      if (!threadInfo.thick) {
        continue;
      }
      thickRawThreadInfos[id] = threadInfo;
    }
    return thickRawThreadInfos;
  },
);

const unreadThickThreadIDsSelector: (
  state: BaseAppState<>,
) => $ReadOnlyArray<string> = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (threadInfos: RawThreadInfos): $ReadOnlyArray<string> =>
    Object.entries(threadInfos)
      .filter(
        ([, threadInfo]) =>
          !!threadInfo.thick && !!threadInfo.currentUser.unread,
      )
      .map(([id]) => id),
);

const unreadCount: (state: BaseAppState<>) => number = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (threadInfos: RawThreadInfos): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInHomeChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const thinThreadsUnreadCountSelector: (state: BaseAppState<>) => {
  +[keyserverID: string]: number,
} = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (threadInfos: RawThreadInfos): { +[keyserverID: string]: number } => {
    const thinThreadInfosList = values(threadInfos).filter(
      threadInfo => !threadInfo.thick,
    );

    const keyserverToThreads = _groupBy(threadInfo =>
      extractKeyserverIDFromID(threadInfo.id),
    )(
      thinThreadInfosList.filter(threadInfo =>
        threadInHomeChatList(threadInfo),
      ),
    );

    const keyserverUnreadCountPairs = Object.entries(keyserverToThreads).map(
      ([keyserverID, keyserverThreadInfos]) => [
        keyserverID,
        keyserverThreadInfos.filter(threadInfo => threadInfo.currentUser.unread)
          .length,
      ],
    );

    return Object.fromEntries(keyserverUnreadCountPairs);
  },
);

const unreadBackgroundCount: (state: BaseAppState<>) => number = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (threadInfos: RawThreadInfos): number =>
    values(threadInfos).filter(
      threadInfo =>
        threadInBackgroundChatList(threadInfo) && threadInfo.currentUser.unread,
    ).length,
);

const baseUnreadCountSelectorForCommunity: (
  communityID: string,
) => (BaseAppState<>) => number = (communityID: string) =>
  createSelector(
    (state: BaseAppState<>) => state.threadStore.threadInfos,
    (threadInfos: RawThreadInfos): number =>
      Object.values(threadInfos).filter(
        threadInfo =>
          threadInHomeChatList(threadInfo) &&
          threadInfo.currentUser.unread &&
          (communityID === threadInfo.community ||
            communityID === threadInfo.id),
      ).length,
  );

const unreadCountSelectorForCommunity: (
  communityID: string,
) => (state: BaseAppState<>) => number = _memoize(
  baseUnreadCountSelectorForCommunity,
);

const baseAncestorThreadInfos: (
  threadID: string,
) => (BaseAppState<>) => $ReadOnlyArray<ThreadInfo> = (threadID: string) =>
  createSelector(
    (state: BaseAppState<>) => threadInfoSelector(state),
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
) => (state: BaseAppState<>) => $ReadOnlyArray<ThreadInfo> = _memoize(
  baseAncestorThreadInfos,
);

const baseOtherUsersButNoOtherAdmins: (
  threadID: string,
) => (BaseAppState<>) => boolean = (threadID: string) =>
  createSelector(
    (state: BaseAppState<>) => state.threadStore.threadInfos[threadID],
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
) => (state: BaseAppState<>) => boolean = _memoize(
  baseOtherUsersButNoOtherAdmins,
);

function mostRecentlyReadThread(
  messageStore: MessageStore,
  threadInfos: MixedRawThreadInfos,
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

    const topLevelThreadID = threadTypeIsSidebar(threadInfo.type)
      ? threadInfo.parentThreadID
      : threadID;
    mostRecent = { threadID: topLevelThreadID, time: mostRecentMessageTime };
  }
  return mostRecent ? mostRecent.threadID : null;
}

const mostRecentlyReadThreadSelector: (state: BaseAppState<>) => ?string =
  createSelector(
    (state: BaseAppState<>) => state.messageStore,
    (state: BaseAppState<>) => state.threadStore.threadInfos,
    mostRecentlyReadThread,
  );

const threadInfoFromSourceMessageIDSelector: (state: BaseAppState<>) => {
  +[id: string]: ThreadInfo,
} = createSelector(
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  threadInfoSelector,
  (
    rawThreadInfos: RawThreadInfos,
    threadInfos: {
      +[id: string]: ThreadInfo,
    },
  ) => {
    const pendingToRealizedThreadIDs =
      pendingToRealizedThreadIDsSelector(rawThreadInfos);
    const result: { [string]: ThreadInfo } = {};
    for (const realizedID of pendingToRealizedThreadIDs.values()) {
      const threadInfo = threadInfos[realizedID];
      if (threadInfo && threadInfo.sourceMessageID) {
        result[threadInfo.sourceMessageID] = threadInfo;
      }
    }
    return result;
  },
);
const pendingToRealizedThreadIDsSelector: (
  rawThreadInfos: RawThreadInfos,
) => $ReadOnlyMap<string, string> = createSelector(
  (rawThreadInfos: RawThreadInfos) => rawThreadInfos,
  (rawThreadInfos: RawThreadInfos) => {
    const result = new Map<string, string>();
    for (const threadID in rawThreadInfos) {
      const rawThreadInfo = rawThreadInfos[threadID];
      if (
        threadIsPending(threadID) ||
        (rawThreadInfo.parentThreadID !== genesis().id &&
          !threadTypeIsSidebar(rawThreadInfo.type) &&
          !threadTypeIsThick(rawThreadInfo.type))
      ) {
        continue;
      }

      const actualMemberIDs = rawThreadInfo.members
        .filter(member => member.role)
        .map(member => member.id);

      // In this function we're generating possible pending thread IDs that
      // could become `rawThreadInfos`. It is possible that a thick pending
      // thread becomes a thin thread, so we're including it twice in a map -
      // for each possible pending thread ID.
      let possiblePendingThreadTypes;
      if (threadTypeIsPersonal(rawThreadInfo.type)) {
        possiblePendingThreadTypes = personalThreadTypes;
      } else if (threadTypeIsPrivate(rawThreadInfo.type)) {
        possiblePendingThreadTypes = privateThreadTypes;
      } else if (threadTypeIsSidebar(rawThreadInfo.type)) {
        possiblePendingThreadTypes = sidebarThreadTypes;
      } else {
        possiblePendingThreadTypes = [
          threadTypes.LOCAL,
          threadTypes.COMMUNITY_SECRET_SUBTHREAD,
        ];
      }

      for (const type of possiblePendingThreadTypes) {
        const pendingThreadID = getPendingThreadID(
          type,
          actualMemberIDs,
          rawThreadInfo.sourceMessageID,
        );
        const existingResult = result.get(pendingThreadID);
        if (
          !existingResult ||
          rawThreadInfos[existingResult].creationTime >
            rawThreadInfo.creationTime
        ) {
          result.set(pendingThreadID, threadID);
        }
      }
    }
    return result;
  },
);

const baseSavedEmojiAvatarSelectorForThread: (
  threadID: string,
  containingThreadID: ?string,
) => (BaseAppState<>) => () => ClientAvatar = (
  threadID: string,
  containingThreadID: ?string,
) =>
  createSelector(
    (state: BaseAppState<>) => threadInfoSelector(state)[threadID],
    (state: BaseAppState<>) =>
      containingThreadID ? threadInfoSelector(state)[containingThreadID] : null,
    (threadInfo: ThreadInfo, containingThreadInfo: ?ThreadInfo) => {
      return () => {
        let threadAvatar = getAvatarForThread(threadInfo, containingThreadInfo);
        if (threadAvatar.type !== 'emoji') {
          threadAvatar = getRandomDefaultEmojiAvatar();
        }
        return threadAvatar;
      };
    },
  );

const savedEmojiAvatarSelectorForThread: (
  threadID: string,
  containingThreadID: ?string,
) => (state: BaseAppState<>) => () => ClientEmojiAvatar = _memoize(
  baseSavedEmojiAvatarSelectorForThread,
);

const baseThreadInfosSelectorForThreadType: (
  threadType: ThreadType,
) => (BaseAppState<>) => $ReadOnlyArray<ThreadInfo> = (
  threadType: ThreadType,
) =>
  createSelector(
    (state: BaseAppState<>) => threadInfoSelector(state),
    (threadInfos: {
      +[id: string]: ThreadInfo,
    }): $ReadOnlyArray<ThreadInfo> => {
      const result = [];

      for (const threadID in threadInfos) {
        const threadInfo = threadInfos[threadID];
        if (threadInfo.type === threadType) {
          result.push(threadInfo);
        }
      }

      return result;
    },
  );

const threadInfosSelectorForThreadType: (
  threadType: ThreadType,
) => (state: BaseAppState<>) => $ReadOnlyArray<ThreadInfo> = _memoize(
  baseThreadInfosSelectorForThreadType,
);

export {
  ancestorThreadInfos,
  threadInfoSelector,
  communityThreadSelector,
  onScreenThreadInfos,
  entryInfoSelector,
  currentDaysToEntries,
  childThreadInfos,
  containedThreadInfos,
  unreadCount,
  thinThreadsUnreadCountSelector,
  unreadBackgroundCount,
  unreadCountSelectorForCommunity,
  otherUsersButNoOtherAdmins,
  mostRecentlyReadThread,
  mostRecentlyReadThreadSelector,
  threadInfoFromSourceMessageIDSelector,
  pendingToRealizedThreadIDsSelector,
  savedEmojiAvatarSelectorForThread,
  threadInfosSelectorForThreadType,
  thickRawThreadInfosSelector,
  unreadThickThreadIDsSelector,
  getChildThreads,
};
