// @flow

import fs from 'fs';

import { getCommConfig } from 'lib/utils/comm-config.js';

import type { UserCredentials } from './checks.js';

async function createFile(path: string, name: string, data: string) {
  const filePath = `${path}/${name}`;

  try {
    await fs.promises.mkdir(path);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
  await fs.promises.writeFile(filePath, data);
}

async function createAuthoritativeKeyserverConfigFiles(userID: string) {
  const userInfo = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  if (!userInfo?.usingIdentityCredentials) {
    // If the keyserver is not set up to use its identity id,
    // we will also not set up the clients to use the keyservers real id
    return;
  }

  try {
    const authoritativeKeyserver = {
      authoritativeKeyserverID: userID,
    };
    const authoritativeKeyserverJSON = JSON.stringify(
      authoritativeKeyserver,
      null,
      2,
    );
    const authoritativeKeyserverFile = 'authoritative_keyserver.json';

    const nativeFactsFolder = '../native/facts';
    const nativePromise = createFile(
      nativeFactsFolder,
      authoritativeKeyserverFile,
      authoritativeKeyserverJSON,
    );

    const keyserverFactsFolder = 'facts';
    const keyserverPromise = createFile(
      keyserverFactsFolder,
      authoritativeKeyserverFile,
      authoritativeKeyserverJSON,
    );

    await Promise.all([nativePromise, keyserverPromise]);
  } catch (e) {
    // This means that the clients will not be configured to use
    // the real keyserver id, and will use the default 256.
    // Try restarting the keyserver or create the files manually
    console.error(
      'Failure creating configuration files: ' +
        'admin data could not be correctly written',
      e,
    );
  }
}

export { createAuthoritativeKeyserverConfigFiles };
