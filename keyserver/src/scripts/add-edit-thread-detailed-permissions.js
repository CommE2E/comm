// @flow

import bots from 'lib/facts/bots.js';
import { assertThreadType } from 'lib/types/thread-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateRoles } from '../updaters/role-updaters.js';
import {
  recalculateThreadPermissions,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters.js';
import RelationshipChangeset from '../utils/relationship-changeset.js';
import { main } from './utils.js';

async function addEditThreadDetailedPermissions() {
  const batchSize = 10;

  const fetchThreads = SQL`SELECT id, type FROM threads`;
  const [result] = await dbQuery(fetchThreads);
  const threads = result.map(row => {
    return { id: row.id.toString(), type: assertThreadType(row.type) };
  });

  const viewer = createScriptViewer(bots.commbot.userID);

  while (threads.length > 0) {
    const batch = threads.splice(0, batchSize);
    const membershipRows = [];
    const relationshipChangeset = new RelationshipChangeset();
    await Promise.all(
      batch.map(async thread => {
        console.log(`updating roles for ${thread.id}`);
        await updateRoles(viewer, thread.id, thread.type);
        console.log(`recalculating permissions for ${thread.id}`);
        const {
          membershipRows: threadMembershipRows,
          relationshipChangeset: threadRelationshipChangeset,
        } = await recalculateThreadPermissions(thread.id);
        membershipRows.push(...threadMembershipRows);
        relationshipChangeset.addAll(threadRelationshipChangeset);
      }),
    );
    console.log(`committing batch ${JSON.stringify(batch)}`);
    await commitMembershipChangeset(viewer, {
      membershipRows,
      relationshipChangeset,
    });
  }
}

main([addEditThreadDetailedPermissions]);
