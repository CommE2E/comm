// @flow

import _compact from 'lodash/fp/compact.js';
import _flow from 'lodash/fp/flow.js';
import _map from 'lodash/fp/map.js';
import _mapValues from 'lodash/fp/mapValues.js';
import { createSelector } from 'reselect';

import { entryInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { EntryInfo } from 'lib/types/entry-types.js';

import type { AppState } from '../redux/redux-setup.js';

const allDaysToEntries: (state: AppState) => {
  +[dayString: string]: EntryInfo[],
} = createSelector(
  entryInfoSelector,
  (state: AppState) => state.entryStore.daysToEntries,
  (
    entryInfos: { +[id: string]: EntryInfo },
    daysToEntries: { +[day: string]: string[] },
  ) =>
    _mapValues((entryIDs: string[]) =>
      _flow(
        _map((entryID: string) => entryInfos[entryID]),
        _compact,
      )(entryIDs),
    )(daysToEntries),
);

export { allDaysToEntries };
