// @flow

import type { PlatformDetails } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';
import { hasMinCodeVersion } from 'lib/shared/version-utils';

async function verifyClientSupported(
  viewer: Viewer,
  platformDetails: ?PlatformDetails,
) {
  if (hasMinCodeVersion(platformDetails, 24)) {
    return;
  }
  const error = new ServerError('client_version_unsupported');
  error.platformDetails = platformDetails;
  throw error;
}

export { verifyClientSupported };
