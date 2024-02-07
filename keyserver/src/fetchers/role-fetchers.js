// @flow

import { specialRoles } from 'lib/permissions/special-roles.js';
import type { ClientLegacyRoleInfo } from 'lib/types/thread-types.js';

import { dbQuery, SQL } from '../database/database.js';

async function fetchRoles(threadID: string): Promise<ClientLegacyRoleInfo[]> {
  const query = SQL`
    SELECT id, name, permissions, 
      special_role = ${specialRoles.DEFAULT_ROLE} AS is_default
    FROM roles
    WHERE thread = ${threadID}
  `;
  const [result] = await dbQuery(query);

  const roles: Array<ClientLegacyRoleInfo> = [];
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
