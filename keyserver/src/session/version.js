// @flow

import { hasMinCodeVersion } from 'lib/shared/version-utils';
import type { PlatformDetails } from 'lib/types/device-types';
import { ServerError } from 'lib/utils/errors';

import type { Viewer } from './viewer';

async function verifyClientSupported(
  viewer: Viewer,
  platformDetails: ?PlatformDetails,
) {
  if (hasMinCodeVersion(platformDetails, 32)) {
    return;
  }
  const error = new ServerError('client_version_unsupported');
  error.platformDetails = platformDetails;
  throw error;
}

export { verifyClientSupported };
