// @flow

import { ServerError } from 'lib/utils/errors.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL } from '../database/database.js';

const MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE = 1062;

async function fetchOrCreateDayID(
  threadID: string,
  date: string,
): Promise<string> {
  if (!threadID || !date) {
    throw new ServerError('invalid_parameters');
  }

  const existingQuery = SQL`
    SELECT id FROM days WHERE date = ${date} AND thread = ${threadID}
  `;
  const [existingResult] = await dbQuery(existingQuery);
  if (existingResult.length > 0) {
    const existingRow = existingResult[0];
    return existingRow.id.toString();
  }

  const [id] = await createIDs('days', 1);
  const insertQuery = SQL`
    INSERT INTO days(id, date, thread) VALUES ${[[id, date, threadID]]}
  `;
  try {
    await dbQuery(insertQuery);
    return id;
  } catch (e) {
    if (e.errno !== MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE) {
      throw new ServerError('unknown_error');
    }
    // There's a race condition that can happen if two people start editing
    // the same date at the same time, and two IDs are created for the same
    // row. If this happens, the UNIQUE constraint `date_thread` should be
    // triggered on the second racer, and for that execution path our last
    // query will have failed. We will recover by re-querying for the ID here,
    // and deleting the extra ID we created from the `ids` table.
    const deleteIDQuery = SQL`DELETE FROM ids WHERE id = ${id}`;
    const [[raceResult]] = await Promise.all([
      dbQuery(existingQuery),
      dbQuery(deleteIDQuery),
    ]);
    if (raceResult.length === 0) {
      throw new ServerError('unknown_error');
    }
    const raceRow = raceResult[0];
    return raceRow.id.toString();
  }
}

export default fetchOrCreateDayID;
