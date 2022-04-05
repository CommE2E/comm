// @flow

import {
  type DeviceTokenUpdateRequest,
  isDeviceType,
} from 'lib/types/device-types';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';

async function deviceTokenUpdater(
  viewer: Viewer,
  update: DeviceTokenUpdateRequest,
): Promise<void> {
  const deviceType = update.platformDetails?.platform ?? update.deviceType;
  if (!isDeviceType(deviceType)) {
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
