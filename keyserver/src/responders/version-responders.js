// @flow

import t, { type TInterface } from 'tcomb';

import type { VersionResponse } from 'lib/types/device-types.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { UserCredentials } from '../user/checks.js';
import { fetchIdentityInfo } from '../user/identity.js';
import { keyserverCodeVersion } from '../version.js';

export const versionResponseValidator: TInterface<VersionResponse> =
  tShape<VersionResponse>({
    codeVersion: t.Number,
    ownerUsername: t.maybe(t.String),
    ownerID: t.maybe(t.String),
  });

async function versionResponder(): Promise<VersionResponse> {
  const userInfoPromise = getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  const identityInfoPromise = fetchIdentityInfo();

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
