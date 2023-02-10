// @flow

import { undirectedStatus } from 'lib/types/relationship-types.js';

import { createUndirectedRelationships } from '../creators/relationship-creators.js';
import { dbQuery, SQL } from '../database/database.js';
import { endScript } from './utils.js';

async function main() {
  try {
    await createFriendRelationshipsForThreadMembers();
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

async function createFriendRelationshipsForThreadMembers() {
  const [result] = await dbQuery(SQL`
    SELECT m.thread, m.user
    FROM memberships m
    LEFT JOIN users u ON u.id = m.user
    WHERE m.role > 0 AND u.id IS NOT NULL
    ORDER BY m.user ASC
  `);

  await createUndirectedRelationships(result, undirectedStatus.FRIEND);
}

main();
