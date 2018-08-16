// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFilters(): Promise<void> {
  // Note that since the f.session = c.id comparison compares a VARCHAR with an
  // INT type, MySQL will caste the former to an INT. This means it will parse
  // off any prefixed numeral characters, and ignore anything after the first
  // non-numeral, which is exactly what we want.
  await dbQuery(SQL`
    DELETE f
    FROM filters f
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN cookies c ON f.session = c.id
    WHERE c.id IS NULL OR u.id IS NULL
  `);
}

export {
  deleteOrphanedFilters,
};
