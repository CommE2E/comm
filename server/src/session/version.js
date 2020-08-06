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

function clientSupported(platformDetails: ?PlatformDetails): boolean {
  if (!platformDetails || platformDetails.platform === 'web') {
    return true;
  }
  const { codeVersion } = platformDetails;
  if (!codeVersion || codeVersion < 24) {
    return false;
  }
  return true;
}

export { verifyClientSupported };
