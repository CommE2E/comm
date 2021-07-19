// @flow

import type { UserPublicKeys } from 'lib/types/user-types';
import { minimumOneTimeKeysRequired } from 'lib/utils/crypto-utils';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database/database';
import { deleteOneTimeKey } from '../deleters/one-time-key-deleters';
import type { Viewer } from '../session/viewer';

async function checkIfUserHasEnoughOneTimeKeys(
  userID: string,
): Promise<boolean> {
  const query = SQL`
    SELECT COUNT(*) AS count 
    FROM one_time_keys 
    WHERE user = ${userID}
  `;
  const [queryResult] = await dbQuery(query);
  if (!queryResult.length || queryResult[0].count === undefined) {
    throw new ServerError('internal_error');
  }
  const [{ count }] = queryResult;
  return count >= minimumOneTimeKeysRequired;
}

async function fetchUserPublicKeys(
  viewer: Viewer,
  userID: string,
): Promise<UserPublicKeys | null> {
  const query = SQL`
    SELECT u.public_key, otk.one_time_key
    FROM users u
    LEFT JOIN one_time_keys otk ON otk.user = u.id
    WHERE u.id = ${userID}
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
  await deleteOneTimeKey(userID, oneTimeKey);

  return { identityKey, oneTimeKey };
}

export { fetchUserPublicKeys, checkIfUserHasEnoughOneTimeKeys };
