// @flow

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import { dbQuery, SQL } from '../database';

async function deviceTokenUpdater(
  viewer: Viewer,
  update: DeviceTokenUpdateRequest,
): Promise<void> {
  viewer.setDeviceToken(update.deviceToken);
  await clearDeviceToken(update.deviceToken);
  const query = SQL`
    UPDATE cookies
    SET device_token = ${update.deviceToken}, platform = ${update.deviceType}
    WHERE id = ${viewer.cookieID}
  `;
  await dbQuery(query);
}

async function clearDeviceToken(
  deviceToken: string,
): Promise<void> {
  const query = SQL`
    UPDATE cookies
    SET device_token = NULL
    WHERE device_token = ${deviceToken}
  `;
  await dbQuery(query);
}

export {
  deviceTokenUpdater,
  clearDeviceToken,
};
