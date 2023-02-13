// @flow

import { createSelector } from 'reselect';

import {
  useFilterThreadInfos as baseUseFilterThreadInfos,
  useFilterThreadSearchIndex as baseUseFilterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type SearchIndex from 'lib/shared/search-index.js';
import { threadInFilterList } from 'lib/shared/thread-utils.js';
import type { FilterThreadInfo } from 'lib/types/filter-types.js';
import type { ThreadInfo, RawThreadInfo } from 'lib/types/thread-types';
import { values } from 'lib/utils/objects.js';

import type { AppState } from '../redux/redux-setup';
import { useSelector } from '../redux/redux-utils.js';

function useFilterThreadInfos(): $ReadOnlyArray<FilterThreadInfo> {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadInfos(calendarActive);
}

function useFilterThreadSearchIndex(): SearchIndex {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadSearchIndex(calendarActive);
}

function filterThreadIDsBelongingToCommunity(
  communityID: string,
  threadInfosObj: { +[id: string]: ThreadInfo | RawThreadInfo },
): $ReadOnlySet<string> {
  const threadInfos = values(threadInfosObj);
  const threadIDs = threadInfos
    .filter(
      thread =>
        (thread.community === communityID || thread.id === communityID) &&
        threadInFilterList(thread),
    )
    .map(item => item.id);
  return new Set(threadIDs);
}

const filterThreadIDsBelongingToCommunitySelector: (
  state: AppState,
) => ?$ReadOnlySet<string> = createSelector(
  (state: AppState) => state.communityIDFilter,
  threadInfoSelector,
  (communityIDFilter: ?string, threadInfos: { +[id: string]: ThreadInfo }) => {
    if (!communityIDFilter) {
      return null;
    }
    return filterThreadIDsBelongingToCommunity(communityIDFilter, threadInfos);
  },
);

export {
  useFilterThreadInfos,
  useFilterThreadSearchIndex,
  filterThreadIDsBelongingToCommunitySelector,
  filterThreadIDsBelongingToCommunity,
};
