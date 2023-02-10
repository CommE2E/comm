// @flow

import {
  generateDeviceID,
  deviceIDCharLength,
  deviceTypes,
  deviceIDFormatRegex,
} from './device-id.js';

describe('generateDeviceID', () => {
  it(
    'passed deviceTypes.KEYSERVER retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.KEYSERVER)).toMatch(
        deviceIDFormatRegex,
      );
    },
  );

  it(
    'passed deviceTypes.WEB retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.WEB)).toMatch(deviceIDFormatRegex);
    },
  );

  it(
    'passed deviceTypes.MOBILE retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.MOBILE)).toMatch(deviceIDFormatRegex);
    },
  );

  it(
    'passed deviceTypes.KEYSERVER retruns a randomly generated string, ' +
      'subject to ^(ks):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.KEYSERVER)).toMatch(
        new RegExp(`^(ks):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );

  it(
    'passed deviceTypes.WEB retruns a randomly generated string, ' +
      'subject to ^(web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.WEB)).toMatch(
        new RegExp(`^(web):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );

  it(
    'passed deviceTypes.MOBILE retruns a randomly generated string, ' +
      'subject to ^(mobile):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceTypes.MOBILE)).toMatch(
        new RegExp(`^(mobile):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );
});
