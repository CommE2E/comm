// @flow

import type { DeviceTokenUpdate } from 'lib/types/device-types';

import { currentViewer } from '../session/viewer';
import { pool, SQL } from '../database';

async function deviceTokenUpdater(update: DeviceTokenUpdate) {
  const column = update.deviceType === "ios"
    ? "ios_device_token"
    : "android_device_token";
  const cookieID = currentViewer().cookieID;
  const query = SQL`UPDATE cookies SET `;
  query.append(column);
  query.append(SQL` = ${update.deviceToken} WHERE id = ${cookieID}`);
  await pool.query(query);
}

export {
  deviceTokenUpdater,
};
