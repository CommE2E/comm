// @flow

import bots from 'lib/facts/bots.json';
import { undirectedStatus } from 'lib/types/relationship-types';
import { threadTypes } from 'lib/types/thread-types';

import { getRolePermissionBlobsForChat } from '../creators/role-creator';
import { createThread } from '../creators/thread-creator';
import { dbQuery, SQL } from '../database/database';
import { createScriptViewer } from '../session/scripts';
import {
  commitMembershipChangeset,
  recalculateAllPermissions,
} from '../updaters/thread-permission-updaters';
import { endScript } from './utils';

async function main() {
  try {
    await markThreadsAsPersonal();
    await createPersonalThreadsForFriends();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function markThreadsAsPersonal() {
  const findThreadsToUpdate = SQL`
    SELECT T.id, r.id AS role
    FROM (
      SELECT MIN(t.id) AS id, m1.user AS user1, m2.user AS user2
      FROM threads t
      INNER JOIN memberships m1 
        ON m1.thread = t.id
      INNER JOIN memberships m2
        ON m2.thread = t.id AND m2.user > m1.user
      LEFT JOIN memberships m3
        ON m3.thread = t.id
          AND m3.user != m1.user
          AND m3.user != m2.user
      INNER JOIN roles r1 
        ON r1.thread = t.id
      LEFT JOIN roles r2
        ON r2.thread = t.id
          AND r2.id != r1.id
      WHERE t.parent_thread_id IS NULL
        AND t.id != ${bots.squadbot.staffThreadID}
        AND m3.user IS NULL
        AND r2.id IS NULL
        AND m1.role != -1
        AND m2.role != -1
      GROUP BY m1.user, m2.user
    ) T
    INNER JOIN roles r ON r.thread = T.id
    WHERE NOT EXISTS (
      SELECT * 
      FROM threads t 
      INNER JOIN memberships m1 ON m1.thread = t.id
      INNER JOIN memberships m2 ON m2.thread = t.id
      WHERE t.type = ${threadTypes.PERSONAL}
        AND m1.user = user1
        AND m2.user = user2
        AND m1.role != -1
        AND m2.role != -1
    )
  `;
  const [result] = await dbQuery(findThreadsToUpdate);
  const threadIDs = result.map((row) => row.id);

  if (threadIDs.length === 0) {
    return;
  }

  const updateThreads = SQL`
    UPDATE threads
    SET type = ${threadTypes.PERSONAL}
    WHERE id IN (${threadIDs})
  `;

  const defaultRolePermissions = getRolePermissionBlobsForChat(
    threadTypes.PERSONAL,
  ).Members;
  const defaultRolePermissionString = JSON.stringify(defaultRolePermissions);
  const viewer = createScriptViewer(bots.squadbot.userID);
  const permissionPromises = result.map(async ({ id, role }) => {
    console.log(`Updating thread ${id} and role ${role}`);
    const updatePermissions = SQL`
      UPDATE roles
      SET permissions = ${defaultRolePermissionString}
      WHERE id = ${role}
    `;
    await dbQuery(updatePermissions);

    const changeset = await recalculateAllPermissions(
      id.toString(),
      threadTypes.PERSONAL,
    );
    return await commitMembershipChangeset(viewer, changeset);
  });

  await Promise.all([dbQuery(updateThreads), ...permissionPromises]);
}

async function createPersonalThreadsForFriends() {
  const usersQuery = SQL`
    SELECT r.user1, r.user2
    FROM relationships_undirected r 
    WHERE r.status = ${undirectedStatus.FRIEND}
      AND r.user1 != ${bots.squadbot.userID}
      AND r.user2 != ${bots.squadbot.userID}
      AND NOT EXISTS (
        SELECT * 
        FROM threads t 
        INNER JOIN memberships m1 ON m1.thread = t.id
        INNER JOIN memberships m2 ON m2.thread = t.id
        WHERE t.type = ${threadTypes.PERSONAL}
          AND m1.user = r.user1
          AND m2.user = r.user2
          AND m1.role != -1
          AND m2.role != -1
      )
  `;
  const [result] = await dbQuery(usersQuery);

  for (const { user1, user2 } of result) {
    console.log(`Creating personal thread for ${user1} and ${user2}`);
    await createThread(createScriptViewer(user1.toString()), {
      type: threadTypes.PERSONAL,
      initialMemberIDs: [user2.toString()],
    });
  }
}

main();
