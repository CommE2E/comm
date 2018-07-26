// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import _isEqual from 'lodash/fp/isEqual';

import { dbQuery, SQL } from '../database';
import { fetchCurrentFilter } from '../fetchers/filter-fetchers';
import { createFilter } from '../creators/filter-creator';

// "Filter" here refers to the "filters" table in MySQL, which stores
// CalendarQueries on a per-cookie basis
async function updateFilterIfChanged(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): Promise<void> {
  const oldCalendarQuery = await fetchCurrentFilter(viewer);
  if (oldCalendarQuery && _isEqual(oldCalendarQuery)(newCalendarQuery)) {
    return;
  }
  await createFilter(viewer, newCalendarQuery);
}

export {
  updateFilterIfChanged,
};
