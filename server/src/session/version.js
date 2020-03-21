// @flow

import type { PlatformDetails } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';

async function verifyClientSupported(
  viewer: Viewer,
  platformDetails: ?PlatformDetails,
) {
  if (clientSupported(platformDetails)) {
    return;
  }
  const error = new ServerError('client_version_unsupported');
  error.platformDetails = platformDetails;
  throw error;
}

// eslint-disable-next-line no-unused-vars
function clientSupported(platformDetails: ?PlatformDetails): boolean {
  // In the future when we decide to deprecate server support for an old client
  // version, we should update this function to return false for those clients
  return true;
}

export { verifyClientSupported };
