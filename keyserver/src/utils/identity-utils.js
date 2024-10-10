// @flow

import { getRustAPI } from 'rust-node-addon';

import type { UserIdentitiesResponse } from 'lib/types/identity-service-types.js';

import { getContentSigningKey } from './olm-utils.js';
import { verifyUserLoggedIn } from '../user/login.js';

async function findUserIdentities(
  userIDs: $ReadOnlyArray<string>,
): Promise<UserIdentitiesResponse> {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);
  return await rustAPI.findUserIdentities(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    userIDs,
  );
}

async function privilegedDeleteUsers(
  userIDs: $ReadOnlyArray<string>,
): Promise<void> {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);
  await rustAPI.privilegedDeleteUsers(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    userIDs,
  );
}

export { findUserIdentities, privilegedDeleteUsers };
