// @flow

import { isDesktopPlatform } from 'lib/types/device-types.js';
import { getConfig } from 'lib/utils/config.js';

function getVersionUnsupportedError(): string {
  const actionRequestMessage = isDesktopPlatform(
    getConfig().platformDetails.platform,
  )
    ? 'Please reload the app'
    : 'Please refresh the page';
  return (
    'Your app version is pretty old, and the server doesn’t know how ' +
    `to speak to it anymore. ${actionRequestMessage}.`
  );
}

export { getVersionUnsupportedError };
