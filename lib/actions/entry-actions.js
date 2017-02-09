// @flow

import type { BaseAppState } from '../types/redux-types';

import fetchJSON from '../utils/fetch-json';
import { registerFetchKey } from '../reducers/loading-reducer';

const fetchAllEntriesForDayActionType
  = registerFetchKey("FETCH_ALL_DAY_ENTRIES");
async function fetchAllEntriesForDay(
  year: number,
  month: number,
  day: number,
  navID: string,
) {
  const response = await fetchJSON('day_history.php', {
    'year': year,
    'month': month,
    'day': day,
    'nav': navID,
  });
  return response.result;
}

const fetchEntriesForMonthActionType = registerFetchKey("FETCH_MONTH_ENTRIES");
async function fetchEntriesForMonth(
  year: number,
  month: number,
  navID: string,
) {
  const response = await fetchJSON('month_entries.php', {
    'month': month,
    'year': year,
    'nav': navID,
  });
  return response.result;
}

export {
  fetchAllEntriesForDayActionType,
  fetchAllEntriesForDay,
  fetchEntriesForMonthActionType,
  fetchEntriesForMonth,
};
