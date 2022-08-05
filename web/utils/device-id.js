// @flow

import invariant from 'invariant';

import { generateRandomString } from './text-utils';

const deviceIDTypes = Object.freeze({
  KEYSERVER: 0,
  WEB: 1,
  MOBILE: 2,
});
type DeviceIDType = $Values<typeof deviceIDTypes>;

const alphanumeric =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
// deviceIDCharLength has to be kept in sync with DEVICEID_CHAR_LENGTH
// which is defined in services/tunnelbroker/src/Constants.h
const deviceIDCharLength = 64;

function generateDeviceID(type: DeviceIDType): string {
  const suffix = generateRandomString(deviceIDCharLength, alphanumeric);

  if (type === deviceIDTypes.KEYSERVER) {
    return `ks:${suffix}`;
  } else if (type === deviceIDTypes.WEB) {
    return `web:${suffix}`;
  } else if (type === deviceIDTypes.MOBILE) {
    return `mobile:${suffix}`;
  }
  invariant(false, `Unhandled device type ${type}`);
}

export { generateDeviceID, deviceIDCharLength, deviceIDTypes };
