// @flow

import { type DeviceTokenUpdateRequest } from 'lib/types/device-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function deviceTokenUpdater(
  viewer: Viewer,
  update: DeviceTokenUpdateRequest,
): Promise<void> {
  const deviceType = update.platformDetails?.platform ?? update.deviceType;
  if (deviceType === undefined) {
    throw new ServerError('invalid_parameters');
  }

  viewer.setDeviceToken(update.deviceToken);
  await clearDeviceToken(update.deviceToken);

  const setColumns = {};
  setColumns.device_token = update.deviceToken;
  setColumns.platform = deviceType;
  if (update.platformDetails) {
    const { platform, ...versions } = update.platformDetails;
    if (Object.keys(versions).length > 0) {
      setColumns.versions = JSON.stringify(versions);
    }
  }

  const query = SQL`
    UPDATE cookies SET ${setColumns} WHERE id = ${viewer.cookieID}
  `;
  await dbQuery(query);
}

async function clearDeviceToken(deviceToken: string): Promise<void> {
  const query = SQL`
    UPDATE cookies
    SET device_token = NULL
    WHERE device_token = ${deviceToken}
  `;
  await dbQuery(query);
}

export { deviceTokenUpdater, clearDeviceToken };
