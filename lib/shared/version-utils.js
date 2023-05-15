// @flow

import { type PlatformDetails, isWebPlatform } from '../types/device-types.js';

/**
 * A code version used for features that are waiting to be released
 * and we're not sure in which version they will be available.
 */
const FUTURE_CODE_VERSION = 1000000;

function hasMinCodeVersion(
  platformDetails: ?PlatformDetails,
  minCodeVersion: $Shape<{ +native: number, +web: number }>,
): boolean {
  if (!platformDetails) {
    return true;
  }
  const { codeVersion } = platformDetails;
  const minVersion = isWebPlatform(platformDetails.platform)
    ? minCodeVersion.web
    : minCodeVersion.native;

  if (!minVersion) {
    return true;
  }
  if (!codeVersion || codeVersion < minVersion) {
    return false;
  }

  return true;
}

export { FUTURE_CODE_VERSION, hasMinCodeVersion };
