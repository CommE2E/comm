// @flow

import { createSelector } from 'reselect';

import {
  useFilterThreadInfos as baseUseFilterThreadInfos,
  useFilterThreadSearchIndex as baseUseFilterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type SearchIndex from 'lib/shared/search-index.js';
import type { FilterThreadInfo } from 'lib/types/filter-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { filterThreadIDsBelongingToCommunity } from 'lib/utils/drawer-utils.react.js';

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

const filterThreadIDsBelongingToCommunitySelector: (
  state: AppState,
) => ?$ReadOnlySet<string> = createSelector(
  (state: AppState) => state.communityPickerStore.calendar,
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
    state => state.communityPickerStore.calendar,
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
