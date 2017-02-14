// @flow

import type { AppState, NavInfo } from '../redux-setup';
import type { EntryInfo } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';

import { createSelector } from 'reselect';
import _ from 'lodash';

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
  ) => _.chain(daysToEntries)
    .pickBy((entryIDs: string[], dayString: string) =>
      dayString.endsWith(`/${navInfo.month}/${navInfo.year}`),
    ).mapKeys((entryIDs: string[], dayString: string) =>
      parseInt(dayString.substr(0, dayString.indexOf('/'))),
    ).mapValues((entryIDs: string[]) => _.chain(entryIDs)
      .map((entryID: string) => entryInfos[entryID])
      .compact()
      .filter((entryInfo: EntryInfo) =>
        _.some(onScreenCalendarInfos, ['id', entryInfo.calendarID])
      ).sortBy("creationTime")
      .value(),
    ).value(),
);

export {
  currentMonthDaysToEntries,
};
