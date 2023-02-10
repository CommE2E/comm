// @flow

import {
  useFilterThreadInfos as baseUseFilterThreadInfos,
  useFilterThreadSearchIndex as baseUseFilterThreadSearchIndex,
} from 'lib/selectors/calendar-selectors.js';
import type SearchIndex from 'lib/shared/search-index.js';
import type { FilterThreadInfo } from 'lib/types/filter-types.js';

import { useSelector } from '../redux/redux-utils.js';

function useFilterThreadInfos(): $ReadOnlyArray<FilterThreadInfo> {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadInfos(calendarActive);
}

function useFilterThreadSearchIndex(): SearchIndex {
  const calendarActive = useSelector(state => state.navInfo.tab === 'calendar');
  return baseUseFilterThreadSearchIndex(calendarActive);
}

export { useFilterThreadInfos, useFilterThreadSearchIndex };
