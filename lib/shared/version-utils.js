// @flow

import { type PlatformDetails, isWebPlatform } from '../types/device-types.js';

/**
 * A code version used for features that are waiting to be released
 * and we're not sure in which version they will be available.
 */
const FUTURE_CODE_VERSION = 1000000;

/**
 * A code version used for features that are waiting to be included
 * in the very next release
 */
const NEXT_CODE_VERSION = 1000000;

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

function hasMinStateVersion(
  platformDetails: ?PlatformDetails,
  minStateVersion: $Shape<{ +native: number, +web: number }>,
): boolean {
  if (!platformDetails) {
    return true;
  }
  const { stateVersion } = platformDetails;
  const minVersion = isWebPlatform(platformDetails.platform)
    ? minStateVersion.web
    : minStateVersion.native;

  if (!minVersion) {
    return true;
  }
  if (!stateVersion || stateVersion < minVersion) {
    return false;
  }

  return true;
}

export {
  FUTURE_CODE_VERSION,
  NEXT_CODE_VERSION,
  hasMinCodeVersion,
  hasMinStateVersion,
};
