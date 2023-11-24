// @flow

import {
  type PlatformDetails,
  isWebPlatform,
  isDesktopPlatform,
} from '../types/device-types.js';

/**
 * A code version used for features that are waiting to be released
 * and we're not sure in which version they will be available.
 */
const FUTURE_CODE_VERSION = 1000000;

/**
 * A code version used for features that are waiting to be included
 * in the very next release
 */
const NEXT_CODE_VERSION = 0;

function hasMinCodeVersion(
  platformDetails: ?PlatformDetails,
  minCodeVersion: $Shape<{
    +native: number,
    +web: number,
    +majorDesktop: number,
  }>,
): boolean {
  if (!platformDetails) {
    return true;
  }

  const { codeVersion, majorDesktopVersion } = platformDetails;
  const minVersion = isWebPlatform(platformDetails.platform)
    ? minCodeVersion.web
    : minCodeVersion.native;

  const minMajorDesktopVersion = isDesktopPlatform(platformDetails.platform)
    ? minCodeVersion.majorDesktop
    : undefined;

  if (!minVersion) {
    return true;
  }
  if (!codeVersion || codeVersion < minVersion) {
    return false;
  }

  if (!minMajorDesktopVersion) {
    return true;
  }

  if (!majorDesktopVersion) {
    return false;
  }

  if (majorDesktopVersion < minMajorDesktopVersion) {
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

function extractMajorDesktopVersion(desktopVersion: string): number {
  return desktopVersion.split('.').map(Number).shift();
}

export {
  FUTURE_CODE_VERSION,
  NEXT_CODE_VERSION,
  hasMinCodeVersion,
  hasMinStateVersion,
  extractMajorDesktopVersion,
};
