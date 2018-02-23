// @flow

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import { pool, SQL } from '../database';

async function deviceTokenUpdater(
  viewer: Viewer,
  update: DeviceTokenUpdateRequest,
): Promise<void> {
  const column = update.deviceType === "ios"
    ? "ios_device_token"
    : "android_device_token";
  const cookieID = viewer.cookieID;
  const query = SQL`UPDATE cookies SET `;
  query.append(column);
  query.append(SQL` = ${update.deviceToken} WHERE id = ${cookieID}`);
  await pool.query(query);
}

export {
  deviceTokenUpdater,
};
