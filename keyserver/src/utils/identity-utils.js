// @flow

import { getRustAPI } from 'rust-node-addon';

import type {
  UserIdentitiesResponse,
  InboundKeyInfoResponse,
} from 'lib/types/identity-service-types.js';
import { ServerError, getMessageForException } from 'lib/utils/errors.js';

import { getContentSigningKey } from './olm-utils.js';
import { clearIdentityInfo, type IdentityInfo } from '../user/identity.js';
import { verifyUserLoggedIn } from '../user/login.js';

async function authVerifiedEndpoint<T>(
  identityRPCPromise: Promise<T>,
): Promise<T> {
  try {
    return await identityRPCPromise;
  } catch (e) {
    const message = getMessageForException(e);
    if (message === 'bad_credentials') {
      await clearIdentityInfo();
    }
    throw e;
  }
}

async function findUserIdentities(
  userIDs: $ReadOnlyArray<string>,
): Promise<UserIdentitiesResponse> {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);
  return await authVerifiedEndpoint(
    rustAPI.findUserIdentities(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
      userIDs,
    ),
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
  await authVerifiedEndpoint(
    rustAPI.privilegedDeleteUsers(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
      userIDs,
    ),
  );
}

async function privilegedResetUserPassword(
  username: string,
  password: string,
  skipPasswordReset: boolean,
): Promise<void> {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);
  await authVerifiedEndpoint(
    rustAPI.privilegedResetUserPassword(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
      username,
      password,
      skipPasswordReset,
    ),
  );
}

async function syncPlatformDetails(identityInfo: IdentityInfo): Promise<void> {
  const [rustAPI, deviceID] = await Promise.all([
    getRustAPI(),
    getContentSigningKey(),
  ]);
  return authVerifiedEndpoint(
    rustAPI.syncPlatformDetails(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
    ),
  );
}

async function uploadOneTimeKeys(
  identityInfo: IdentityInfo,
  contentOneTimeKeys: $ReadOnlyArray<string>,
  notifOneTimeKeys: $ReadOnlyArray<string>,
): Promise<void> {
  const [rustAPI, deviceID] = await Promise.all([
    getRustAPI(),
    getContentSigningKey(),
  ]);

  await authVerifiedEndpoint(
    rustAPI.uploadOneTimeKeys(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
      contentOneTimeKeys,
      notifOneTimeKeys,
    ),
  );
}

async function publishPrekeys(
  deviceID: string,
  contentPrekey: string,
  contentPrekeySignature: string,
  notifPrekey: string,
  notifPrekeySignature: string,
): Promise<void> {
  const [rustAPI, identityInfo] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
  ]);

  if (!identityInfo) {
    console.warn(
      'Attempted to refresh prekeys before registering with Identity service',
    );
    return;
  }

  await authVerifiedEndpoint(
    rustAPI.publishPrekeys(
      identityInfo.userId,
      deviceID,
      identityInfo.accessToken,
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
    ),
  );
}

async function getInboundKeysForUserDevice(
  userID: string,
  deviceID: string,
): Promise<InboundKeyInfoResponse> {
  const [authDeviceID, identityInfo, rustAPI] = await Promise.all([
    getContentSigningKey(),
    verifyUserLoggedIn(),
    getRustAPI(),
  ]);

  if (!identityInfo) {
    throw new ServerError('account_not_registered_on_identity_service');
  }

  return authVerifiedEndpoint(
    rustAPI.getInboundKeysForUserDevice(
      identityInfo.userId,
      authDeviceID,
      identityInfo.accessToken,
      userID,
      deviceID,
    ),
  );
}

export {
  findUserIdentities,
  privilegedDeleteUsers,
  privilegedResetUserPassword,
  syncPlatformDetails,
  uploadOneTimeKeys,
  publishPrekeys,
  getInboundKeysForUserDevice,
};
