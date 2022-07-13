// @flow

import type { RoleInfo } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { getDBType } from '../database/db-config';

async function fetchRoles(threadID: string): Promise<RoleInfo[]> {
  const query = SQL`
    SELECT r.id, r.name, r.permissions, r.id = t.default_role AS is_default
    FROM roles r
    LEFT JOIN threads t ON t.id = r.thread
    WHERE r.thread = ${threadID}
  `;
  const [[result], dbType] = await Promise.all([dbQuery(query), getDBType()]);

  const roles = [];
  for (const row of result) {
    roles.push({
      id: row.id.toString(),
      name: row.name,
      permissions:
        dbType === 'mysql5.7' ? row.permissions : JSON.parse(row.permissions),
      isDefault: Boolean(row.is_default),
    });
  }
  return roles;
}

export { fetchRoles };
