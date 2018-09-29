// @flow

import type { PlatformDetails } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';

import { createNewAnonymousCookie } from './cookies';
import { deleteCookiesOnLogOut } from '../deleters/cookie-deleters';

async function verifyClientSupported(
  viewer: Viewer,
  platformDetails: ?PlatformDetails,
) {
  if (clientSupported(platformDetails)) {
    return;
  }
  if (viewer.loggedIn) {
    const [ data ] = await Promise.all([
      createNewAnonymousCookie(platformDetails),
      deleteCookiesOnLogOut(viewer.userID, viewer.cookieID),
    ]);
    viewer.setNewCookie(data);
    viewer.cookieInvalidated = true;
  }
  throw new ServerError("client_version_unsupported");
}

function clientSupported(platformDetails: ?PlatformDetails): bool {
  // In the future when we decide to deprecate server support for an old client
  // version, we should update this function to return false for those clients
  return true;
}

export {
  verifyClientSupported,
};
