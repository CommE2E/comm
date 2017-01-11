// @flow

import type { AppState } from './redux-reducer';
import type { CalendarInfo } from './calendar-info';

import { createSelector } from 'reselect';
import _ from 'lodash';

import { currentNavID } from './nav-utils';

function colorIsDark(color: string) {
  const red = parseInt(color.substring(0, 2), 16);
  const green = parseInt(color.substring(2, 4), 16);
  const blue = parseInt(color.substring(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 < 187;
}

const onScreenCalendarInfos = createSelector(
  currentNavID,
  (state: AppState) => state.calendarInfos,
  (currentNavID: ?string, calendarInfos: {[id: string]: CalendarInfo}) => {
    if (currentNavID === "home") {
      return _.filter(calendarInfos, 'subscribed');
    } else if (currentNavID && calendarInfos[currentNavID]) {
      return [ calendarInfos[currentNavID] ];
    } else {
      return [];
    }
  },
);

const typeaheadSortedCalendarInfos = createSelector(
  (state: AppState) => state.calendarInfos,
  currentNavID,
  (state: AppState) => state.navInfo.calendarID,
  (
    calendarInfos: {[id: string]: CalendarInfo},
    currentNavID: ?string,
    currentCalendarID: ?string,
  ) => {
    const currentInfos = [];
    const subscribedInfos = [];
    const recommendedInfos = [];
    for (const calendarID: string in calendarInfos) {
      if (calendarID === currentNavID) {
        continue;
      }
      const calendarInfo = calendarInfos[calendarID];
      if (!currentNavID && calendarID === currentCalendarID) {
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

export {
  colorIsDark,
  onScreenCalendarInfos,
  typeaheadSortedCalendarInfos,
}
