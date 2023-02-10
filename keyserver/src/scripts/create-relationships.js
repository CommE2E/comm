// @flow

import { undirectedStatus } from 'lib/types/relationship-types.js';

import { createUndirectedRelationships } from '../creators/relationship-creators.js';
import { dbQuery, SQL } from '../database/database.js';
import { saveMemberships } from '../updaters/thread-permission-updaters.js';
import { endScript } from './utils.js';

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
      operation: 'save',
      userID: row.user.toString(),
      threadID: row.thread.toString(),
      userNeedsFullThreadDetails: false,
      intent: 'none',
      permissions: null,
      permissionsForChildren: null,
      role: '-1',
      oldRole: '-1',
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

  await createUndirectedRelationships(result, undirectedStatus.KNOW_OF);
}

main();
