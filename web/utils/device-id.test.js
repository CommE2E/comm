// @flow

import {
  generateDeviceID,
  deviceIDCharLength,
  deviceIDTypes,
  deviceIDFormatRegex,
} from './device-id';

describe('generateDeviceID', () => {
  it(
    'passed deviceIDTypes.KEYSERVER retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.KEYSERVER)).toMatch(
        deviceIDFormatRegex,
      );
    },
  );

  it(
    'passed deviceIDTypes.WEB retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.WEB)).toMatch(deviceIDFormatRegex);
    },
  );

  it(
    'passed deviceIDTypes.MOBILE retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.MOBILE)).toMatch(
        deviceIDFormatRegex,
      );
    },
  );

  it(
    'passed deviceIDTypes.KEYSERVER retruns a randomly generated string, ' +
      'subject to ^(ks):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.KEYSERVER)).toMatch(
        new RegExp(`^(ks):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );

  it(
    'passed deviceIDTypes.WEB retruns a randomly generated string, ' +
      'subject to ^(web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.WEB)).toMatch(
        new RegExp(`^(web):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );

  it(
    'passed deviceIDTypes.MOBILE retruns a randomly generated string, ' +
      'subject to ^(mobile):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.MOBILE)).toMatch(
        new RegExp(`^(mobile):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`),
      );
    },
  );
});
