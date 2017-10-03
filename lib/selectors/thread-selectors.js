// @flow

import type { BaseAppState } from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';
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
const _mapValuesWithKeys = _mapValues.convert({ cap: false });

import { currentNavID } from './nav-selectors';
import { dateString, dateFromString } from '../utils/date-utils';
import { createEntryInfo } from '../shared/entry-utils';

const onScreenThreadInfos = createSelector(
  currentNavID,
  (state: BaseAppState) => state.threadInfos,
  (currentNavID: ?string, threadInfos: {[id: string]: ThreadInfo}) => {
    if (currentNavID === "home") {
      return _filter('subscribed')(threadInfos);
    } else if (currentNavID && threadInfos[currentNavID]) {
      return [ threadInfos[currentNavID] ];
    } else {
      return [];
    }
  },
);

const typeaheadSortedThreadInfos = createSelector(
  (state: BaseAppState) => state.threadInfos,
  currentNavID,
  (state: BaseAppState) => state.navInfo.threadID,
  (
    threadInfos: {[id: string]: ThreadInfo},
    currentNavID: ?string,
    currentThreadID: ?string,
  ) => {
    const currentInfos = [];
    const subscribedInfos = [];
    const recommendedInfos = [];
    for (const threadID: string in threadInfos) {
      if (threadID === currentNavID) {
        continue;
      }
      const threadInfo = threadInfos[threadID];
      if (!currentNavID && threadID === currentThreadID) {
        currentInfos.push(threadInfo);
      } else if (threadInfo.subscribed) {
        subscribedInfos.push(threadInfo);
      } else {
        recommendedInfos.push(threadInfo);
      }
    }
    return {
      current: currentInfos,
      subscribed: subscribedInfos,
      recommended: recommendedInfos,
    };
  },
);

// "current" means within startDate/endDate range, not deleted, and in
// onScreenThreadInfos
const currentDaysToEntries = createSelector(
  (state: BaseAppState) => state.entryStore.entryInfos,
  (state: BaseAppState) => state.entryStore.daysToEntries,
  (state: BaseAppState) => state.navInfo.startDate,
  (state: BaseAppState) => state.navInfo.endDate,
  (state: BaseAppState) => state.userInfos,
  (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
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
  (state: BaseAppState) => state.threadInfos,
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

export {
  onScreenThreadInfos,
  typeaheadSortedThreadInfos,
  currentDaysToEntries,
  childThreadInfos,
}
