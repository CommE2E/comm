// @flow

import _flatten from 'lodash/fp/flatten.js';
import _flow from 'lodash/fp/flow.js';
import _groupBy from 'lodash/fp/groupBy.js';
import _isEqual from 'lodash/fp/isEqual.js';
import _map from 'lodash/fp/map.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _uniqWith from 'lodash/fp/uniqWith.js';
import _values from 'lodash/fp/values.js';

import {
  type UndirectedStatus,
  undirectedStatus,
} from 'lib/types/relationship-types.js';
import { getAllTuples } from 'lib/utils/array.js';

import { createUpdates } from './update-creator.js';
import {
  updateUndirectedRelationships,
  updateDatasForUserPairs,
} from '../updaters/relationship-updaters.js';

type QueryResult = {
  +thread: number,
  +user: number,
};
async function createUndirectedRelationships(
  dbQueryResult: $ReadOnlyArray<QueryResult>,
  setStatus: UndirectedStatus,
) {
  const userPairs = _flow([
    _groupBy(membership => membership.thread),
    _mapValues(_flow([_map(membership => membership.user), getAllTuples])),
    _values,
    _flatten,
    _uniqWith(_isEqual),
  ])(dbQueryResult);

  const changeset = userPairs.map(([user1, user2]) => ({
    user1,
    user2,
    status: setStatus,
  }));
  await updateUndirectedRelationships(changeset);

  if (setStatus !== undirectedStatus.KNOW_OF) {
    // We don't call createUpdates for KNOW_OF because the KNOW_OF
    // migration shouldn't lead to any changes in the userStore
    await createUpdates(updateDatasForUserPairs(userPairs));
  }
}

export { createUndirectedRelationships };
