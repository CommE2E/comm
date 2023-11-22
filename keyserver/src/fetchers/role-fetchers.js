// @flow

import { specialRoles } from 'lib/permissions/special-roles.js';
import type { RoleInfo } from 'lib/types/thread-types.js';

import { dbQuery, SQL } from '../database/database.js';

async function fetchRoles(threadID: string): Promise<RoleInfo[]> {
  const query = SQL`
    SELECT r.id, r.name, r.permissions, 
    r.special_role = ${specialRoles.DEFAULT_ROLE} AS is_default
    FROM roles r
    LEFT JOIN threads t ON t.id = r.thread
    WHERE r.thread = ${threadID}
  `;
  const [result] = await dbQuery(query);

  const roles = [];
  for (const row of result) {
    roles.push({
      id: row.id.toString(),
      name: row.name,
      permissions: JSON.parse(row.permissions),
      isDefault: Boolean(row.is_default),
    });
  }
  return roles;
}

export { fetchRoles };
