// @flow

import _compact from 'lodash/fp/compact';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _mapValues from 'lodash/fp/mapValues';
import { createSelector } from 'reselect';

import { entryInfoSelector } from 'lib/selectors/thread-selectors';
import type { EntryInfo } from 'lib/types/entry-types';

import type { AppState } from '../redux/redux-setup';

const allDaysToEntries: (
  state: AppState,
) => { +[dayString: string]: EntryInfo[] } = createSelector(
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
