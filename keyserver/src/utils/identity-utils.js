// @flow

import { getRustAPI } from 'rust-node-addon';

import type { UserIdentitiesResponse } from 'lib/types/identity-service-types.js';

import { getContentSigningKey } from './olm-utils.js';
import type { IdentityInfo } from '../user/identity.js';
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

async function privilegedResetUserPassword(
  username: string,
  password: string,
): Promise<void> {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);
  await rustAPI.privilegedResetUserPassword(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    username,
    password,
  );
}

async function syncPlatformDetails(identityInfo: IdentityInfo): Promise<void> {
  const [rustAPI, deviceID] = await Promise.all([
    getRustAPI(),
    getContentSigningKey(),
  ]);
  return rustAPI.syncPlatformDetails(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
  );
}

export {
  findUserIdentities,
  privilegedDeleteUsers,
  privilegedResetUserPassword,
  syncPlatformDetails,
};
