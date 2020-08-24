// @flow

import { undirectedStatus } from 'lib/types/relationship-types';

import _flow from 'lodash/fp/flow';
import _groupBy from 'lodash/fp/groupBy';
import _mapValues from 'lodash/fp/mapValues';
import _map from 'lodash/fp/map';
import _values from 'lodash/fp/values';
import _flatten from 'lodash/fp/flatten';
import _uniqWith from 'lodash/fp/uniqWith';
import _isEqual from 'lodash/fp/isEqual';

import { getAllTuples } from 'lib/utils/array';

import { updateUndirectedRelationships } from '../updaters/relationship-updaters';
import { saveMemberships } from '../updaters/thread-permission-updaters';
import { dbQuery, SQL } from '../database';
import { endScript } from './utils';

async function main() {
  try {
    await alterMemberships();
    await createMembershipsForFormerMembers();
    await createKnowOfRelationships();
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

async function alterMemberships() {
  await dbQuery(
    SQL`ALTER TABLE memberships CHANGE permissions permissions json DEFAULT NULL`,
  );
}

async function createMembershipsForFormerMembers() {
  const [result] = await dbQuery(SQL`
    SELECT DISTINCT thread, user 
    FROM messages m
    WHERE NOT EXISTS (
      SELECT thread, user FROM memberships mm 
      WHERE m.thread = mm.thread AND m.user = mm.user
    )
  `);

  const rowsToSave = [];
  for (const row of result) {
    rowsToSave.push({
      operation: 'update',
      userID: row.user.toString(),
      threadID: row.thread.toString(),
      permissions: null,
      permissionsForChildren: null,
      role: '-1',
    });
  }

  await saveMemberships(rowsToSave);
}

async function createKnowOfRelationships() {
  const [result] = await dbQuery(SQL`
    SELECT thread, user FROM memberships 
    UNION SELECT thread, user FROM messages
    ORDER BY user ASC
  `);

  const changeset = _flow([
    _groupBy(membership => membership.thread),
    _mapValues(_flow([_map(membership => membership.user), getAllTuples])),
    _values,
    _flatten,
    _uniqWith(_isEqual),
    _map(([user1, user2]) => ({
      user1,
      user2,
      status: undirectedStatus.KNOW_OF,
    })),
  ])(result);

  await updateUndirectedRelationships(changeset);
}

main();
