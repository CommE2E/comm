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
import type { ThreadInfo, RawThreadInfo } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

import type { AppState } from '../redux/redux-setup.js';
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
  (state: AppState) => state.pickedCommunityIDs.calendar,
  threadInfoSelector,
  (
    calendarPickedCommunityID: ?string,
    threadInfos: { +[id: string]: ThreadInfo },
  ) => {
    if (!calendarPickedCommunityID) {
      return null;
    }
    return filterThreadIDsBelongingToCommunity(
      calendarPickedCommunityID,
      threadInfos,
    );
  },
);

function useCommunityIsPickedCalendar(communityID: string): boolean {
  const calendarPickedCommunityID = useSelector(
    state => state.pickedCommunityIDs.calendar,
  );
  return communityID === calendarPickedCommunityID;
}

export {
  useFilterThreadInfos,
  useFilterThreadSearchIndex,
  filterThreadIDsBelongingToCommunitySelector,
  filterThreadIDsBelongingToCommunity,
  useCommunityIsPickedCalendar,
};
