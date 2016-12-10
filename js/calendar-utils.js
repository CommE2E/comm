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
  (currentNavID: string, calendarInfos: {[id: string]: CalendarInfo}) => {
    if (currentNavID === "home") {
      return _.filter(calendarInfos, 'subscribed');
    } else if (currentNavID) {
      return [ calendarInfos[currentNavID] ];
    } else {
      return [];
    }
  },
);

const subscriptionExistsIn = (calendarInfos: {[id: string]: CalendarInfo}) =>
  _.some(calendarInfos, 'subscribed');

const subscriptionExists = createSelector(
  (state: AppState) => state.calendarInfos,
  (calendarInfos: {[id: string]: CalendarInfo}) =>
    subscriptionExistsIn(calendarInfos),
);

export {
  colorIsDark,
  onScreenCalendarInfos,
  subscriptionExistsIn,
  subscriptionExists,
}
