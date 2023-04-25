// @flow

import { type PlatformDetails, isWebPlatform } from '../types/device-types.js';

/**
 * A code version used for features that are waiting to be released
 * and we're not sure in which version they will be available.
 */
const FUTURE_CODE_VERSION = 1000000;

function hasMinCodeVersion(
  platformDetails: ?PlatformDetails,
  minCodeVersion: number,
): boolean {
  if (!platformDetails || isWebPlatform(platformDetails.platform)) {
    return true;
  }
  const { codeVersion } = platformDetails;
  if (!codeVersion || codeVersion < minCodeVersion) {
    return false;
  }
  return true;
}

export { FUTURE_CODE_VERSION, hasMinCodeVersion };
