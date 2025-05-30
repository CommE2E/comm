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

function getBackupIsNewerThanAppError(): string {
  const actionRequestMessage = isDesktopPlatform(
    getConfig().platformDetails.platform,
  )
    ? 'Please reload the app'
    : 'Please refresh the page';
  return (
    'The backup you’re restoring was made with a newer version ' +
    `of the app. ${actionRequestMessage} in order to proceed.`
  );
}

function getShortVersionUnsupportedError(): string {
  const actionRequestMessage = isDesktopPlatform(
    getConfig().platformDetails.platform,
  )
    ? 'please reload'
    : 'please refresh';
  return `client version unsupported. ${actionRequestMessage}`;
}

export {
  getVersionUnsupportedError,
  getShortVersionUnsupportedError,
  getBackupIsNewerThanAppError,
};
