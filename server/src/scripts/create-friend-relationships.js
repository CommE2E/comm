// @flow

import { undirectedStatus } from 'lib/types/relationship-types';

import { createUndirectedRelationships } from '../creators/relationship-creators';
import { dbQuery, SQL } from '../database';
import { endScript } from './utils';

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
    SELECT thread, user 
    FROM memberships 
    WHERE role > 0
    ORDER BY user ASC
  `);

  await createUndirectedRelationships(result, undirectedStatus.FRIEND);
}

main();
