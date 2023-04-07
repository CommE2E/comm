// @flow

import { nonThreadCalendarFilters } from 'lib/selectors/calendar-filter-selectors.js';
import { calendarThreadFilterTypes } from 'lib/types/filter-types.js';
import type { CalendarFilter } from 'lib/types/filter-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';

import {
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
} from './action-types.js';
import type { Action, CommunityPickerStore } from './redux-setup';
import { filterThreadIDsBelongingToCommunity } from '../selectors/calendar-selectors.js';

export type ReduceCommunityPickerStoreResult = {
  +communityPickerStore: CommunityPickerStore,
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
};

export function reduceCommunityPickerStore(
  communityPickerStore: CommunityPickerStore,
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  threadStore: ThreadStore,
  action: Action,
): ReduceCommunityPickerStoreResult {
  if (action.type === updateCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(calendarFilters);

    const threadIDs = Array.from(
      filterThreadIDsBelongingToCommunity(
        action.payload,
        threadStore.threadInfos,
      ),
    );
    return {
      calendarFilters: [
        ...nonThreadFilters,
        {
          type: calendarThreadFilterTypes.THREAD_LIST,
          threadIDs,
        },
      ],
      communityPickerStore: {
        ...communityPickerStore,
        calendar: action.payload,
      },
    };
  } else if (action.type === clearCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(calendarFilters);
    return {
      calendarFilters: nonThreadFilters,
      communityPickerStore: {
        ...communityPickerStore,
        calendar: null,
      },
    };
  }
  return { communityPickerStore, calendarFilters };
}
