// @flow

import bots from 'lib/facts/bots.json';
import { threadTypes } from 'lib/types/thread-types';

import { getRolePermissionBlobsForChat } from '../creators/role-creator';
import { privateThreadDescription } from '../creators/thread-creator';
import { dbQuery, SQL } from '../database/database';
import { createScriptViewer } from '../session/scripts';
import { DEPRECATED_updateRoleAndPermissions } from '../updaters/role-updaters';
import { main } from './utils';

async function markThreadsAsPrivate() {
  const findThreadsToUpdate = SQL`
    SELECT t.id, r.id AS role
    FROM (
      SELECT t.id
      FROM threads t
      INNER JOIN memberships m
        ON m.thread = t.id
      WHERE t.type = ${threadTypes.CHAT_SECRET}
      GROUP BY id
      HAVING
        COUNT(m.thread) = 1
    ) t
    INNER JOIN roles r ON r.thread = t.id
  `;
  const [result] = await dbQuery(findThreadsToUpdate);
  const threadIDs = result.map((row) => row.id);

  if (threadIDs.length === 0) {
    return;
  }

  const updateThreads = SQL`
    UPDATE threads
    SET type = ${threadTypes.PRIVATE}, description = ${privateThreadDescription}
    WHERE id IN (${threadIDs})
  `;

  const defaultRolePermissions = getRolePermissionBlobsForChat(
    threadTypes.PRIVATE,
  ).Members;
  const viewer = createScriptViewer(bots.squadbot.userID);
  const permissionPromises = result.map(async ({ id, role }) => {
    console.log(`Updating thread ${id} and role ${role}`);
    return await DEPRECATED_updateRoleAndPermissions(
      viewer,
      id.toString(),
      threadTypes.PRIVATE,
      role.toString(),
      defaultRolePermissions,
    );
  });

  await Promise.all([dbQuery(updateThreads), ...permissionPromises]);
}

main([markThreadsAsPrivate]);
