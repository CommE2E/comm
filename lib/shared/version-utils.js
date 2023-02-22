// @flow

import { type PlatformDetails, isWebPlatform } from '../types/device-types.js';

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

export { hasMinCodeVersion };
