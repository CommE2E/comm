// @flow

import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import { ServerError } from 'lib/utils/errors.js';

import type { Viewer } from './viewer.js';

async function verifyClientSupported(
  viewer: Viewer,
  platformDetails: ?PlatformDetails,
) {
  if (hasMinCodeVersion(platformDetails, 31)) {
    return;
  }
  const error = new ServerError('client_version_unsupported');
  error.platformDetails = platformDetails;
  throw error;
}

export { verifyClientSupported };
