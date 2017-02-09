// @flow

import type {
  BaseNavInfo,
  BaseAppState,
  Dispatch,
} from '../model/redux-reducer';
import type { CalendarInfo } from '../model/calendar-info';

import { createSelector } from 'reselect';
import _ from 'lodash';
import invariant from 'invariant';

import fetchJSON from '../utils/fetch-json';
import { reduxWrapPromise } from '../utils/fetch-utils';
import { registerFetchKey } from '../utils/loading-utils';

const subscriptionExists = createSelector(
  (state: BaseAppState) => state.calendarInfos,
  (calendarInfos: {[id: string]: CalendarInfo}) =>
    _.some(calendarInfos, 'subscribed'),
);

const currentNavID = createSelector(
  (state: BaseAppState) => state.navInfo,
  (state: BaseAppState) => state.calendarInfos,
  subscriptionExists,
  (
    navInfo: BaseNavInfo,
    calendarInfos: {[id: string]: CalendarInfo},
    subscriptionExists: bool,
  ) => {
    if (navInfo.home) {
      return subscriptionExists ? "home" : null;
    }
    invariant(navInfo.calendarID, "either home or calendarID should be set");
    const calendarInfo = calendarInfos[navInfo.calendarID];
    if (!calendarInfo || !calendarInfo.authorized) {
      return null;
    }
    return navInfo.calendarID;
  },
);

const fetchAllEntriesAndUpdateStoreKey
  = registerFetchKey("FETCH_ALL_DAY_ENTRIES");
function fetchAllEntriesAndUpdateStore<T: BaseAppState, A>(
  year: number,
  month: number,
  day: number,
  navID: string,
) {
  return reduxWrapPromise(
    fetchAllEntriesAndUpdateStoreKey,
    fetchJSON('day_history.php', {
      'year': year,
      'month': month,
      'day': day,
      'nav': navID,
    }),
  );
}

const fetchEntriesAndUpdateStoreKey = registerFetchKey("FETCH_MONTH_ENTRIES");
function fetchEntriesAndUpdateStore<T: BaseAppState, A>(
  year: number,
  month: number,
  navID: string,
) {
  return reduxWrapPromise(
    fetchEntriesAndUpdateStoreKey,
    fetchJSON('month_entries.php', {
      'month': month,
      'year': year,
      'nav': navID,
    }),
  );
}

export {
  subscriptionExists,
  currentNavID,
  fetchAllEntriesAndUpdateStore,
  fetchAllEntriesAndUpdateStoreKey,
  fetchEntriesAndUpdateStore,
  fetchEntriesAndUpdateStoreKey,
};
