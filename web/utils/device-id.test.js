// @flow

import {
  generateDeviceID,
  deviceIDCharLength,
  deviceIDTypes,
} from './device-id';

describe('generateDeviceID', () => {
  const baseRegExp = new RegExp(
    `^(ks|mobile|web):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`,
  );
  it(
    'passed deviceIDTypes.KEYSERVER retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.KEYSERVER)).toMatch(baseRegExp);
    },
  );

  it(
    'passed deviceIDTypes.WEB retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.WEB)).toMatch(baseRegExp);
    },
  );

  it(
    'passed deviceIDTypes.MOBILE retruns a randomly generated string, ' +
      'subject to ^(ks|mobile|web):[a-zA-Z0-9]{DEVICEID_CHAR_LENGTH}$',
    () => {
      expect(generateDeviceID(deviceIDTypes.MOBILE)).toMatch(baseRegExp);
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
