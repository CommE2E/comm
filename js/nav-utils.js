// @flow

import type { NavInfo, AppState, UpdateStore } from './redux-reducer';

import { createSelector } from 'reselect';
import _ from 'lodash';
import update from 'immutability-helper';
import invariant from 'invariant';

import fetchJSON from './fetch-json';

const currentNavID = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => {
    if (navInfo.home) {
      return "home";
    }
    invariant(navInfo.squadID, "either home or squadID should be set");
    return navInfo.squadID;
  },
);

function urlForYearAndMonth(year: number, month: number) {
  return `year/${year}/month/${month}/`;
}

const monthURL = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => {
    return urlForYearAndMonth(navInfo.year, navInfo.month);
  },
);

const thisNavURLFragment = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => {
    if (navInfo.home) {
      return "home/";
    }
    invariant(navInfo.squadID, "either home or squadID should be set");
    return `squad/${navInfo.squadID}/`;
  },
);

const thisURL = createSelector(
  monthURL,
  thisNavURLFragment,
  (monthURL: string, thisNavURLFragment: string) =>
    thisNavURLFragment + monthURL,
);

async function fetchEntriesAndUpdateStore(
  year: number,
  month: number,
  navID: string,
  updateStore: UpdateStore,
) {
  updateStore((prevState: AppState) => {
    return update(prevState, {
      navInfo: {
        entriesLoadingStatus: { $set: "loading" },
      },
    });
  });
  const response = await fetchJSON('month_entries.php', {
    'month': month,
    'year': year,
    'nav': navID,
  });
  if (!response.result) {
    updateStore((prevState: AppState) => {
      return update(prevState, {
        navInfo: {
          entriesLoadingStatus: { $set: "error" },
        },
      });
    });
    return;
  }
  updateStore((prevState: AppState) => {
    const newEntries = _.chain(response.result)
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
    return update(prevState, {
      navInfo: {
        entriesLoadingStatus: { $set: "inactive" },
      },
      entryInfos: newEntries,
    });
  });
}

export {
  currentNavID,
  urlForYearAndMonth,
  monthURL,
  thisNavURLFragment,
  thisURL,
  fetchEntriesAndUpdateStore,
};
