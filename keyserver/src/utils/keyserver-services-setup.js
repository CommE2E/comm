// @flow

import { ignorePromiseRejections } from 'lib/utils/promises.js';
import sleep from 'lib/utils/sleep.js';

import { syncPlatformDetails } from './identity-utils.js';
import { isPrimaryNode, isSecondaryNode } from './primary-secondary-utils.js';
import { createAndMaintainTunnelbrokerWebsocket } from '../socket/tunnelbroker.js';
import { createAuthoritativeKeyserverConfigFiles } from '../user/create-configs.js';
import { fetchIdentityInfo } from '../user/identity.js';
import { authAndSaveIdentityInfo } from '../user/login.js';

async function setUpKeyserverWithServices() {
  // Should not be run by Landing or WebApp nodes
  if (!isPrimaryNode && !isSecondaryNode) {
    return;
  }

  let identityInfo = await fetchIdentityInfo();
  // Secondary nodes should not attempt identity auth. Instead, they should poll
  // until the identity info is in the database
  if (isSecondaryNode) {
    while (!identityInfo) {
      await sleep(5000);
      identityInfo = await fetchIdentityInfo();
    }
    return;
  }
  // If the primary node is able to fetch persisted identity info, it should
  // attempt to sync platform details with the identity service
  if (identityInfo) {
    ignorePromiseRejections(syncPlatformDetails(identityInfo));
  } else {
    identityInfo = await authAndSaveIdentityInfo();
  }

  // We don't await here, as Tunnelbroker communication is not needed for normal
  // keyserver behavior yet. In addition, this doesn't return information useful
  // for other keyserver functions.
  ignorePromiseRejections(createAndMaintainTunnelbrokerWebsocket(null));

  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  await createAuthoritativeKeyserverConfigFiles(identityInfo.userId);
}

export { setUpKeyserverWithServices };
