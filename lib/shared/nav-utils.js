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

let saveAttemptIndex = 0;

function fetchAllEntriesAndUpdateStore<T: BaseAppState, A>(
  year: number,
  month: number,
  day: number,
  navID: string,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  return async (dispatch: Dispatch<T, A>) => {
    dispatch({
      type: "FETCH_ALL_DAY_ENTRIES_STARTED",
      onlyLatestRequestMatters: true,
      fetchIndex: curSaveAttempt,
    });
    const response = await fetchJSON('day_history.php', {
      'year': year,
      'month': month,
      'day': day,
      'nav': navID,
    });
    if (response.result) {
      dispatch({
        type: "FETCH_ALL_DAY_ENTRIES_SUCCESS",
        payload: response.result,
        fetchIndex: curSaveAttempt,
      });
    } else {
      dispatch({
        type: "FETCH_ALL_DAY_ENTRIES_FAILED",
        error: true,
        fetchIndex: curSaveAttempt,
      });
    }
  };
}

function fetchEntriesAndUpdateStore<T: BaseAppState, A>(
  year: number,
  month: number,
  navID: string,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  return async (dispatch: Dispatch<T, A>) => {
    dispatch({
      type: "FETCH_MONTH_ENTRIES_STARTED",
      onlyLatestRequestMatters: true,
      fetchIndex: curSaveAttempt,
    });
    const response = await fetchJSON('month_entries.php', {
      'month': month,
      'year': year,
      'nav': navID,
    });
    if (response.result) {
      dispatch({
        type: "FETCH_MONTH_ENTRIES_SUCCESS",
        payload: response.result,
        fetchIndex: curSaveAttempt,
      });
    } else {
      dispatch({
        type: "FETCH_MONTH_ENTRIES_FAILED",
        error: true,
        fetchIndex: curSaveAttempt,
      });
    }
  };
}

export {
  subscriptionExists,
  currentNavID,
  fetchAllEntriesAndUpdateStore,
  fetchEntriesAndUpdateStore,
};
