// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOneTimeKey(
  session: string,
  oneTimeKey: string,
): Promise<void> {
  await dbQuery(SQL`
    DELETE
    FROM one_time_keys
    WHERE session = ${session} AND one_time_key = ${oneTimeKey}
  `);
}

export { deleteOneTimeKey };
