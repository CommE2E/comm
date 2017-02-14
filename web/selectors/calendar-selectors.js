// @flow

import type { AppState, NavInfo } from '../redux-setup';
import type { EntryInfo } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';

import { createSelector } from 'reselect';
import _flow from 'lodash/fp/flow';
import _some from 'lodash/fp/some';
import _pickBy from 'lodash/fp/pickBy';
import _mapKeys from 'lodash/fp/mapKeys';
import _mapValues from 'lodash/fp/mapValues';
import _map from 'lodash/fp/map';
import _compact from 'lodash/fp/compact';
import _filter from 'lodash/fp/filter';
import _sortBy from 'lodash/fp/sortBy';

import { onScreenCalendarInfos } from 'lib/selectors/calendar-selectors';

const currentMonthDaysToEntries = createSelector(
  (state: AppState) => state.navInfo,
  (state: AppState) => state.entryInfos,
  (state: AppState) => state.daysToEntries,
  onScreenCalendarInfos,
  (
    navInfo: NavInfo,
    entryInfos: {[id: string]: EntryInfo},
    daysToEntries: {[day: string]: string[]},
    onScreenCalendarInfos: CalendarInfo[],
  ) => _flow(
    _pickBy((entryIDs: string[], dayString: string) =>
      dayString.endsWith(`/${navInfo.month}/${navInfo.year}`),
    ),
    _mapKeys((dayString: string) =>
      parseInt(dayString.substr(0, dayString.indexOf('/'))),
    ),
    _mapValues((entryIDs: string[]) => _flow(
      _map((entryID: string) => entryInfos[entryID]),
      _compact,
      _filter((entryInfo: EntryInfo) =>
        _some(['id', entryInfo.calendarID])(onScreenCalendarInfos),
      ),
      _sortBy("creationTime"),
    )(entryIDs)),
  )(daysToEntries),
);

export {
  currentMonthDaysToEntries,
};
