// @flow

import invariant from 'invariant';

import { pool, SQL } from '../database';

async function createIDs(
  tableName: string,
  numIDsToCreate: number,
): Promise<string[]> {
  if (numIDsToCreate === 0) {
    return [];
  }

  const idInserts = Array(numIDsToCreate).fill([tableName]);
  const query = SQL`INSERT INTO ids(table_name) VALUES ${idInserts}`;
  const [ result ] = await pool.query(query);
  const firstNewID = result.insertId;
  invariant(firstNewID !== null && firstNewID !== undefined, "should be set");
  return Array.from(
    new Array(numIDsToCreate),
    (val, index) => (index + firstNewID).toString(),
  );
}

export default createIDs;
