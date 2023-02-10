// @flow

import type { PlatformDetails } from '../types/device-types.js';

function hasMinCodeVersion(
  platformDetails: ?PlatformDetails,
  minCodeVersion: number,
): boolean {
  if (!platformDetails || platformDetails.platform === 'web') {
    return true;
  }
  const { codeVersion } = platformDetails;
  if (!codeVersion || codeVersion < minCodeVersion) {
    return false;
  }
  return true;
}

export { hasMinCodeVersion };
