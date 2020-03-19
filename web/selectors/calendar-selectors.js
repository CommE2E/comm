// @flow

import type { AppState } from '../redux-setup';
import type { FilterThreadInfo } from 'lib/types/filter-types';

import { createSelector } from 'reselect';

import {
  filterThreadInfos,
  filterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors';
import type SearchIndex from 'lib/shared/search-index';

const webFilterThreadInfos: (
  state: AppState,
) => () => $ReadOnlyArray<FilterThreadInfo> = createSelector(
  filterThreadInfos,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    threadInfoFunc: (
      calendarActive: boolean,
    ) => $ReadOnlyArray<FilterThreadInfo>,
    calendarActive: boolean,
  ) => () => threadInfoFunc(calendarActive),
);

const webFilterThreadSearchIndex: (
  state: AppState,
) => () => SearchIndex = createSelector(
  filterThreadSearchIndex,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    threadSearchIndexFunc: (calendarActive: boolean) => SearchIndex,
    calendarActive: boolean,
  ) => () => threadSearchIndexFunc(calendarActive),
);

export { webFilterThreadInfos, webFilterThreadSearchIndex };
