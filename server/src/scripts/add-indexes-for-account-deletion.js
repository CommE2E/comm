// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addIndexes() {
  /* eslint-disable no-irregular-whitespace */
  await dbQuery(SQL`
    ALTER TABLE memberships ADD INDEX user (user);
    ALTER TABLE notifications ADD INDEX user (user);
    ALTER TABLE relationships_directed ADD UNIQUE user2_user1 (user2, user1);
  `);
  /* eslint-enable no-irregular-whitespace */
}

main([addIndexes]);
