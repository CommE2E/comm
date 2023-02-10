// @flow

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function saveOneTimeKeys(
  viewer: Viewer,
  oneTimeKeys: $ReadOnlyArray<string>,
): Promise<void> {
  if (oneTimeKeys.length === 0) {
    return;
  }

  const insertData = oneTimeKeys.map(oneTimeKey => [
    viewer.session,
    oneTimeKey,
  ]);

  const query = SQL`
    INSERT INTO one_time_keys(session, one_time_key)
    VALUES ${insertData}
  `;
  await dbQuery(query);
}

export { saveOneTimeKeys };
