// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function deleteMemberships() {
  const query = SQL`
    DELETE m
    FROM memberships m 
    LEFT JOIN users u ON u.id = m.user
    WHERE m.role = -1 AND u.id IS NULL
  `;

  await dbQuery(query);
}

main([deleteMemberships]);
