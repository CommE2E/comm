// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarInfo } from '../types/calendar-types';
import type { EntryInfo } from '../types/entry-types';

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

function colorIsDark(color: string) {
  const red = parseInt(color.substring(0, 2), 16);
  const green = parseInt(color.substring(2, 4), 16);
  const blue = parseInt(color.substring(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 < 187;
}

const onScreenCalendarInfos = createSelector(
  currentNavID,
  (state: BaseAppState) => state.calendarInfos,
  (currentNavID: ?string, calendarInfos: {[id: string]: CalendarInfo}) => {
    if (currentNavID === "home") {
      return _filter('subscribed')(calendarInfos);
    } else if (currentNavID && calendarInfos[currentNavID]) {
      return [ calendarInfos[currentNavID] ];
    } else {
      return [];
    }
  },
);

const typeaheadSortedCalendarInfos = createSelector(
  (state: BaseAppState) => state.calendarInfos,
  currentNavID,
  (state: BaseAppState) => state.navInfo.threadID,
  (
    calendarInfos: {[id: string]: CalendarInfo},
    currentNavID: ?string,
    currentCalendarID: ?string,
  ) => {
    const currentInfos = [];
    const subscribedInfos = [];
    const recommendedInfos = [];
    for (const threadID: string in calendarInfos) {
      if (threadID === currentNavID) {
        continue;
      }
      const calendarInfo = calendarInfos[threadID];
      if (!currentNavID && threadID === currentCalendarID) {
        currentInfos.push(calendarInfo);
      } else if (calendarInfo.subscribed) {
        subscribedInfos.push(calendarInfo);
      } else {
        recommendedInfos.push(calendarInfo);
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
// onScreenCalendarInfos
const currentDaysToEntries = createSelector(
  (state: BaseAppState) => state.entryInfos,
  (state: BaseAppState) => state.daysToEntries,
  (state: BaseAppState) => state.navInfo.startDate,
  (state: BaseAppState) => state.navInfo.endDate,
  onScreenCalendarInfos,
  (
    entryInfos: {[id: string]: EntryInfo},
    daysToEntries: {[day: string]: string[]},
    startDateString: string,
    endDateString: string,
    onScreenCalendarInfos: CalendarInfo[],
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
        _map((entryID: string) => entryInfos[entryID]),
        _compact,
        _filter(
          (entryInfo: EntryInfo) => !entryInfo.deleted &&
            _some(['id', entryInfo.threadID])(onScreenCalendarInfos),
        ),
        _sortBy("creationTime"),
      )(daysToEntries[dayString] ? daysToEntries[dayString] : []),
    )(allDaysWithinRange);
  },
);

export {
  colorIsDark,
  onScreenCalendarInfos,
  typeaheadSortedCalendarInfos,
  currentDaysToEntries,
}
