// @flow

import type { VersionResponse } from 'lib/types/device-types.js';
import { getCommConfig } from 'lib/utils/comm-config.js';

import type { UserCredentials } from '../user/checks.js';
import { verifyUserLoggedIn } from '../user/login.js';
import { keyserverCodeVersion } from '../version.js';

async function versionResponder(): Promise<VersionResponse> {
  const userInfoPromise = getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  const identityInfoPromise = verifyUserLoggedIn();

  const [userInfo, identityInfo] = await Promise.all([
    userInfoPromise,
    identityInfoPromise,
  ]);

  return {
    codeVersion: keyserverCodeVersion,
    ownerUsername: userInfo?.username,
    ownerID: identityInfo?.userId,
  };
}

export { versionResponder };
