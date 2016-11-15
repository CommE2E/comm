// @flow

import type { NavInfo, AppState, UpdateStore } from './redux-reducer';
import type { SquadInfo } from './squad-info';

import { createSelector } from 'reselect';
import _ from 'lodash';
import update from 'immutability-helper';

import fetchJSON from './fetch-json';

const currentNavID = createSelector(
  (state: AppState) => state.navInfo,
  (state: AppState) => state.squadInfos,
  (navInfo: NavInfo, squadInfos: {[id: string]: SquadInfo}) => {
    if (navInfo.home) {
      return "home";
    } else if (navInfo.squadID) {
      return navInfo.squadID;
    } else if (_.some(squadInfos, 'subscribed')) {
      return "home";
    } else {
      return "254";
    }
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
    } else if (navInfo.squadID) {
      return `squad/${navInfo.squadID}/`;
    }
    return "";
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
        (entryInfoGroup) => _.chain(entryInfoGroup)
          .keyBy('id')
          .mapValues((result) => ({ $set: result }))
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
