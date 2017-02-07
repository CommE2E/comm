// @flow

import type {
  BaseNavInfo,
  BaseAppState,
  UpdateStore,
} from '../model/redux-reducer';
import type { CalendarInfo } from '../model/calendar-info';
import type { EntryInfo } from '../model/entry-info';

import { createSelector } from 'reselect';
import _ from 'lodash';
import update from 'immutability-helper';
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

function mergeNewEntriesIntoStore<T: BaseAppState>(
  updateStore: UpdateStore<T>,
  entryInfos: EntryInfo[],
) {
  updateStore((prevState: T) => {
    const newEntries = _.chain(entryInfos)
      .groupBy((entryInfo) => entryInfo.day)
      .mapValues(
        (entryInfoGroup, day) => _.chain(entryInfoGroup)
          .keyBy('id')
          .mapValues((result) => {
            // Try to preserve localIDs. This is because we use them as React
            // keys and we would prefer not to have to change those.
            const currentEntryInfo = prevState.entryInfos[day][result.id];
            if (currentEntryInfo && currentEntryInfo.localID) {
              result.localID = currentEntryInfo.localID;
            }
            return { $set: result };
          })
          .value(),
      ).value();
    return update(prevState, { entryInfos: newEntries });
  });
}

let saveAttemptIndex = 0;
async function fetchEntriesAndUpdateStore<T: BaseAppState>(
  year: number,
  month: number,
  navID: string,
  updateStore: UpdateStore<T>,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  updateStore((prevState: T) => update(prevState, {
    entriesLoadingStatus: { $set: "loading" },
  }));
  const response = await fetchJSON('month_entries.php', {
    'month': month,
    'year': year,
    'nav': navID,
  });
  if (!response.result) {
    if (curSaveAttempt === saveAttemptIndex) {
      updateStore((prevState: T) => update(prevState, {
        entriesLoadingStatus: { $set: "error" },
      }));
    }
    return;
  }
  mergeNewEntriesIntoStore(updateStore, response.result);
  if (curSaveAttempt === saveAttemptIndex) {
    updateStore((prevState: T) => update(prevState, {
      entriesLoadingStatus: { $set: "inactive" },
    }));
  }
}

export {
  subscriptionExists,
  currentNavID,
  mergeNewEntriesIntoStore,
  fetchEntriesAndUpdateStore,
};
