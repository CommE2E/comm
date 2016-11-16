// @flow

import type { AppState } from './redux-reducer';
import type { SquadInfo } from './squad-info';

import { createSelector } from 'reselect';
import _ from 'lodash';

import { currentNavID } from './nav-utils';

function colorIsDark(color: string) {
  const red = parseInt(color.substring(0, 2), 16);
  const green = parseInt(color.substring(2, 4), 16);
  const blue = parseInt(color.substring(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 < 187;
}

const onScreenSquadInfos = createSelector(
  currentNavID,
  (state: AppState) => state.squadInfos,
  (currentNavID: string, squadInfos: {[id: string]: SquadInfo}) => {
    if (currentNavID !== "home") {
      return [ squadInfos[currentNavID] ];
    }
    return _.filter(squadInfos, 'subscribed');
  },
);

const subscriptionExistsIn = (squadInfos: {[id: string]: SquadInfo}) =>
  _.some(squadInfos, 'subscribed');

const subscriptionExists = createSelector(
  (state: AppState) => state.squadInfos,
  (squadInfos: {[id: string]: SquadInfo}) => subscriptionExistsIn(squadInfos),
);

export {
  colorIsDark,
  onScreenSquadInfos,
  subscriptionExistsIn,
  subscriptionExists,
}
