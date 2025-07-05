// @flow

import { specialRoles } from 'lib/permissions/special-roles.js';

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';
import { joinThread, updateRole } from '../updaters/thread-updaters.js';

async function transferAdminPermissions() {
  const currentAdminUserID = '';
  const newAdminUserID = '';
  const [result] = await dbQuery(SQL`
    SELECT m.thread, m.role, dr.id AS default_role
    FROM memberships m
    LEFT JOIN roles r ON r.id = m.role
    LEFT JOIN roles dr ON dr.special_role = ${specialRoles.DEFAULT_ROLE}
      AND dr.thread = m.thread
    WHERE m.user = ${currentAdminUserID} AND r.special_role = ${specialRoles.ADMIN_ROLE}
  `);

  const newAdminViewer = createScriptViewer(newAdminUserID);
  const currentAdminViewer = createScriptViewer(currentAdminUserID);
  for (const row of result) {
    const threadID = row.thread.toString();
    console.log(`processing ${threadID}...`);
    const adminRole = row.role.toString();
    const defaultRole = row.default_role.toString();
    await joinThread(newAdminViewer, { threadID });
    await updateRole(
      newAdminViewer,
      {
        threadID,
        memberIDs: [newAdminUserID],
        role: adminRole,
      },
      {
        silenceNewMessages: true,
      },
    );
    await updateRole(
      currentAdminViewer,
      {
        threadID,
        memberIDs: [currentAdminUserID],
        role: defaultRole,
      },
      {
        silenceNewMessages: true,
      },
    );
  }
}

main([transferAdminPermissions]);
