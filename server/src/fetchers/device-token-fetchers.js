// @flow

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';

async function fetchDeviceTokensForCookie(
  cookieID: string,
): Promise<?string> {
  const query = SQL`
    SELECT device_token
    FROM cookies
    WHERE id = ${cookieID}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_cookie');
  }
  const row = result[0];
  return row.device_token;
}

export {
  fetchDeviceTokensForCookie,
};
