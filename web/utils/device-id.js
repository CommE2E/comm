// @flow

import invariant from 'invariant';

import { generateRandomString } from './text-utils.js';

const deviceTypes = Object.freeze({
  KEYSERVER: 0,
  WEB: 1,
  MOBILE: 2,
});
type DeviceType = $Values<typeof deviceTypes>;

const alphanumeric =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
// deviceIDCharLength has to be kept in sync with DEVICEID_CHAR_LENGTH
// which is defined in services/tunnelbroker/src/Constants.h
// and with DEVICE_ID_CHAR_LENGTH
// defined in native/native_rust_library/src/crypto_tools.rs
const deviceIDCharLength = 64;
// deviceIDFormatRegex has to be kept in sync with DEVICEID_FORMAT_REGEX
// which is defined in services/tunnelbroker/src/Constants.h
// and with DEVICE_ID_FORMAT_REGEX
// defined in native/native_rust_library/src/crypto_tools.rs
const deviceIDFormatRegex: RegExp = new RegExp(
  `^(ks|mobile|web):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`,
);

// generateDeviceID has to be kept in sync with generate_device_id
// which is defined in native/native_rust_library/src/crypto_tools.rs
// Next line is because ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function generateDeviceID(type: DeviceType): string {
  const suffix = generateRandomString(deviceIDCharLength, alphanumeric);

  if (type === deviceTypes.KEYSERVER) {
    return `ks:${suffix}`;
  } else if (type === deviceTypes.WEB) {
    return `web:${suffix}`;
  } else if (type === deviceTypes.MOBILE) {
    return `mobile:${suffix}`;
  }
  invariant(false, `Unhandled device type ${type}`);
}

export {
  generateDeviceID,
  deviceIDCharLength,
  deviceTypes,
  deviceIDFormatRegex,
};
