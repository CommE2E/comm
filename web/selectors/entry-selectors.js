// @flow

import type { AppState } from '../redux-setup';
import type { RawEntryInfo } from 'lib/types/entry-types';
import type { UserInfo } from 'lib/types/user-types';

import { createSelector } from 'reselect';
import _mapValues from 'lodash/fp/mapValues';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _compact from 'lodash/fp/compact';

import { createEntryInfo } from 'lib/shared/entry-utils';

const allDaysToEntries = createSelector(
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.entryStore.daysToEntries,
  (state: AppState) => state.userInfos,
  (state: AppState) => state.currentUserInfo && state.currentUserInfo.id,
  (
    entryInfos: {[id: string]: RawEntryInfo},
    daysToEntries: {[day: string]: string[]},
    userInfos: {[id: string]: UserInfo},
    viewerID: ?string,
  ) => _mapValues((entryIDs: string[]) =>
    _flow(
      _map(
        (entryID: string) =>
          createEntryInfo(entryInfos[entryID], viewerID, userInfos),
      ),
      _compact,
    )(entryIDs),
  )(daysToEntries),
);

export {
  allDaysToEntries,
};
