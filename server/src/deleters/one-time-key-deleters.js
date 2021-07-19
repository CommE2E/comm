// @flow

import { dbQuery, SQL } from '../database/database';

async function deleteOneTimeKey(
  userID: string,
  oneTimeKey: string,
): Promise<void> {
  await dbQuery(SQL`
    DELETE
    FROM one_time_keys
    WHERE user = ${userID} AND one_time_key = ${oneTimeKey}
  `);
}

export { deleteOneTimeKey };
