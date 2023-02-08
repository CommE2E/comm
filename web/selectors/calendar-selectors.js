// @flow

import { createSelector } from 'reselect';

import {
  useFilterThreadInfos as baseUseFilterThreadInfos,
  useFilterThreadSearchIndex as baseUseFilterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import type SearchIndex from 'lib/shared/search-index';
import { threadInFilterList } from 'lib/shared/thread-utils';
import type { FilterThreadInfo } from 'lib/types/filter-types';
import type { ThreadInfo, RawThreadInfo } from 'lib/types/thread-types';
import { values } from 'lib/utils/objects';

import type { AppState } from '../redux/redux-setup';
import { useSelector } from '../redux/redux-utils';

function useFilterThreadInfos(): $ReadOnlyArray<FilterThreadInfo> {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadInfos(calendarActive);
}

function useFilterThreadSearchIndex(): SearchIndex {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadSearchIndex(calendarActive);
}

function threadIDsBelongingToCommunity(
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

const threadIDsBelongingToCommunitySelector: (
  state: AppState,
) => ?$ReadOnlySet<string> = createSelector(
  (state: AppState) => state.communityIDFilter,
  threadInfoSelector,
  (communityIDFilter: ?string, threadInfos: { +[id: string]: ThreadInfo }) => {
    if (!communityIDFilter) {
      return null;
    }
    return threadIDsBelongingToCommunity(communityIDFilter, threadInfos);
  },
);

export {
  useFilterThreadInfos,
  useFilterThreadSearchIndex,
  threadIDsBelongingToCommunitySelector,
  threadIDsBelongingToCommunity,
};
