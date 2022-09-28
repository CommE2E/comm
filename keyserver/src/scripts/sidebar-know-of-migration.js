// @flow

import bots from 'lib/facts/bots';
import { threadTypes, type ThreadType } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { createScriptViewer } from '../session/scripts';
import { updateRoles } from '../updaters/role-updaters';
import {
  recalculateThreadPermissions,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';
import RelationshipChangeset from '../utils/relationship-changeset';
import { main } from './utils';

async function updatePrivateThreads() {
  console.log('updating private threads');
  await updateThreads(threadTypes.PRIVATE);
}

async function updateSidebars() {
  console.log('updating sidebars');
  await updateThreads(threadTypes.SIDEBAR);
}

const batchSize = 10;

async function updateThreads(threadType: ThreadType) {
  const fetchThreads = SQL`
    SELECT id FROM threads WHERE type = ${threadType}
  `;
  const [result] = await dbQuery(fetchThreads);
  const threadIDs = result.map(row => row.id.toString());

  const viewer = createScriptViewer(bots.commbot.userID);
  while (threadIDs.length > 0) {
    const batch = threadIDs.splice(0, batchSize);
    const membershipRows = [];
    const relationshipChangeset = new RelationshipChangeset();
    await Promise.all(
      batch.map(async threadID => {
        console.log(`updating roles for ${threadID}`);
        await updateRoles(viewer, threadID, threadType);
        console.log(`recalculating permissions for ${threadID}`);
        const {
          membershipRows: threadMembershipRows,
          relationshipChangeset: threadRelationshipChangeset,
        } = await recalculateThreadPermissions(threadID);
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

// This migration is supposed to update the database to reflect
// https://phabricator.ashoat.com/D1020. There are two changes there:
// (1) Changes to SIDEBAR so membership no longer automatically confers KNOW_OF
// (2) Changes to PRIVATE so all of its children have KNOW_OF
// We want to apply the changes to PRIVATE first so that when we recalculate
// the permissions for any of a PRIVATE thread's SIDEBARs, the parent has
// already been updated.
main([updatePrivateThreads, updateSidebars]);
