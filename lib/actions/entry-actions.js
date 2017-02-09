// @flow

import type { BaseAppState } from '../types/redux-types';

import fetchJSON from '../utils/fetch-json';
import { reduxWrapPromise } from '../utils/fetch-utils';
import { registerFetchKey } from '../reducers/loading-reducer';

const fetchAllEntriesAndUpdateStoreKey
  = registerFetchKey("FETCH_ALL_DAY_ENTRIES");
function fetchAllEntriesAndUpdateStore(
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
function fetchEntriesAndUpdateStore(
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
  fetchAllEntriesAndUpdateStore,
  fetchAllEntriesAndUpdateStoreKey,
  fetchEntriesAndUpdateStore,
  fetchEntriesAndUpdateStoreKey,
};
