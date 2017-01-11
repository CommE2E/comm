// @flow

import type { NavInfo, AppState, UpdateStore } from './redux-reducer';
import type { CalendarInfo } from './calendar-info';
import type { EntryInfo } from './calendar/entry-info';

import { createSelector } from 'reselect';
import _ from 'lodash';
import update from 'immutability-helper';
import invariant from 'invariant';

import fetchJSON from './fetch-json';

const subscriptionExists = createSelector(
  (state: AppState) => state.calendarInfos,
  (calendarInfos: {[id: string]: CalendarInfo}) =>
    _.some(calendarInfos, 'subscribed'),
);

const currentNavID = createSelector(
  (state: AppState) => state.navInfo,
  (state: AppState) => state.calendarInfos,
  subscriptionExists,
  (
    navInfo: NavInfo,
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

function urlForYearAndMonth(year: number, month: number) {
  return `year/${year}/month/${month}/`;
}

const monthURL = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => urlForYearAndMonth(navInfo.year, navInfo.month),
);

function urlForHomeAndCalendarID(home: bool, calendarID: ?string) {
  if (home) {
    return "home/";
  }
  invariant(calendarID, "either home or calendarID should be set");
  return `calendar/${calendarID}/`;
}

const thisNavURLFragment = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => urlForHomeAndCalendarID(
    navInfo.home,
    navInfo.calendarID
  ),
);

const thisURL = createSelector(
  monthURL,
  thisNavURLFragment,
  (monthURL: string, thisNavURLFragment: string) =>
    thisNavURLFragment + monthURL,
);

function mergeNewEntriesIntoStore(
  updateStore: UpdateStore,
  entryInfos: EntryInfo[],
) {
  updateStore((prevState: AppState) => {
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
async function fetchEntriesAndUpdateStore(
  year: number,
  month: number,
  navID: string,
  updateStore: UpdateStore,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  updateStore((prevState: AppState) => update(prevState, {
    entriesLoadingStatus: { $set: "loading" },
  }));
  const response = await fetchJSON('month_entries.php', {
    'month': month,
    'year': year,
    'nav': navID,
  });
  if (!response.result) {
    if (curSaveAttempt === saveAttemptIndex) {
      updateStore((prevState: AppState) => update(prevState, {
        entriesLoadingStatus: { $set: "error" },
      }));
    }
    return;
  }
  mergeNewEntriesIntoStore(updateStore, response.result);
  if (curSaveAttempt === saveAttemptIndex) {
    updateStore((prevState: AppState) => update(prevState, {
      entriesLoadingStatus: { $set: "inactive" },
    }));
  }
}

export {
  subscriptionExists,
  currentNavID,
  urlForYearAndMonth,
  monthURL,
  urlForHomeAndCalendarID,
  thisNavURLFragment,
  thisURL,
  mergeNewEntriesIntoStore,
  fetchEntriesAndUpdateStore,
};
