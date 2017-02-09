// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { EntryInfo } from '../types/entry-types';

import _ from 'lodash';
import update from 'immutability-helper';

export default function reduceEntryInfos<T: BaseAppState>(
  state: {[day: string]: {[id: string]: EntryInfo}},
  action: BaseAction<T>,
) {
  if (
    action.type === "FETCH_MONTH_ENTRIES_SUCCESS" ||
      action.type === "FETCH_ALL_DAY_ENTRIES_SUCCESS"
  ) {
    const newEntries = _.chain(action.payload)
      .groupBy((entryInfo) => entryInfo.day)
      .mapValues(
        (entryInfoGroup, day) => _.chain(entryInfoGroup)
          .keyBy('id')
          .mapValues((result) => {
            // Try to preserve localIDs. This is because we use them as React
            // keys and we would prefer not to have to change those.
            const currentEntryInfo = state[day][result.id];
            if (currentEntryInfo && currentEntryInfo.localID) {
              result.localID = currentEntryInfo.localID;
            }
            return { $set: result };
          })
          .value(),
      ).value();
    return update(state, newEntries);
  }
  return state;
}
