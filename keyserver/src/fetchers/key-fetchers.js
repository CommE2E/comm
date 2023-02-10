// @flow

import type { SessionPublicKeys } from 'lib/types/session-types.js';
import { minimumOneTimeKeysRequired } from 'lib/utils/crypto-utils.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { deleteOneTimeKey } from '../deleters/one-time-key-deleters.js';

async function checkIfSessionHasEnoughOneTimeKeys(
  session: string,
): Promise<boolean> {
  const query = SQL`
    SELECT COUNT(*) AS count 
    FROM one_time_keys 
    WHERE session = ${session}
  `;
  const [queryResult] = await dbQuery(query);
  if (!queryResult.length || queryResult[0].count === undefined) {
    throw new ServerError('internal_error');
  }
  const [{ count }] = queryResult;
  return count >= minimumOneTimeKeysRequired;
}

async function fetchSessionPublicKeys(
  session: string,
): Promise<SessionPublicKeys | null> {
  const query = SQL`
    SELECT s.public_key, otk.one_time_key
    FROM sessions s
    LEFT JOIN one_time_keys otk ON otk.session = s.id
    WHERE s.id = ${session}
    LIMIT 1
  `;
  const [queryResult] = await dbQuery(query);
  if (!queryResult.length) {
    return null;
  }
  const [result] = queryResult;

  if (!result.public_key) {
    return null;
  }

  const oneTimeKey = result.one_time_key;
  const identityKey = result.public_key;
  await deleteOneTimeKey(session, oneTimeKey);

  return { identityKey, oneTimeKey };
}

export { fetchSessionPublicKeys, checkIfSessionHasEnoughOneTimeKeys };
