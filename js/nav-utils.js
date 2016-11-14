// @flow

import type { NavInfo, AppState } from './redux-reducer';
import type { SquadInfo } from './squad-info';

import { createSelector } from 'reselect';
import _ from 'lodash';

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

export {
  currentNavID,
  urlForYearAndMonth,
  monthURL,
  thisNavURLFragment,
  thisURL,
};
