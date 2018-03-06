// @flow

import type { DeviceTokens } from 'lib/types/device-types';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';

async function fetchDeviceTokensForCookie(
  cookieID: string,
): Promise<DeviceTokens> {
  const query = SQL`
    SELECT ios_device_token, android_device_token
    FROM cookies
    WHERE id = ${cookieID}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_cookie');
  }
  const row = result[0];
  return {
    ios: row.ios_device_token,
    android: row.android_device_token,
  };
}

export {
  fetchDeviceTokensForCookie,
};
