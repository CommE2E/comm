// @flow

import type { AppState } from '../redux-setup';
import type { FilterThreadInfo } from 'lib/types/filter-types';

import { createSelector } from 'reselect';

import {
  filterThreadInfos,
  filterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors';
import type SearchIndex from 'lib/shared/search-index';

const webFilterThreadInfos = createSelector<*, *, *, *, *>(
  filterThreadInfos,
  (state: AppState) => state.navInfo.tab === "calendar",
  (
    threadInfoFunc: (calendarActive: bool) => $ReadOnlyArray<FilterThreadInfo>,
    calendarActive: bool,
  ) => () => threadInfoFunc(calendarActive),
);

const webFilterThreadSearchIndex = createSelector<*, *, *, *, *>(
  filterThreadSearchIndex,
  (state: AppState) => state.navInfo.tab === "calendar",
  (
    threadSearchIndexFunc: (calendarActive: bool) => SearchIndex,
    calendarActive: bool,
  ) => () => threadSearchIndexFunc(calendarActive),
);

export {
  webFilterThreadInfos,
  webFilterThreadSearchIndex,
};
