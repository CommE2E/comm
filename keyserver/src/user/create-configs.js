// @flow

import fs from 'fs';

import { getCommConfig } from 'lib/utils/comm-config.js';

import type { UserCredentials } from './checks.js';

async function createConfigFiles(userID: string) {
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
    if (!fs.existsSync(nativeFactsFolder)) {
      fs.mkdirSync(nativeFactsFolder);
    }
    const nativeAuthoritativeKeyserverFile = `${nativeFactsFolder}/${authoritativeKeyserverFile}`;
    fs.writeFileSync(
      nativeAuthoritativeKeyserverFile,
      authoritativeKeyserverJSON,
    );

    const keyserverFactsFolder = 'facts';
    if (!fs.existsSync(keyserverFactsFolder)) {
      fs.mkdirSync(keyserverFactsFolder);
    }
    const keyserverAuthoritativeKeyserverFile = `${keyserverFactsFolder}/${authoritativeKeyserverFile}`;
    fs.writeFileSync(
      keyserverAuthoritativeKeyserverFile,
      authoritativeKeyserverJSON,
    );
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

export { createConfigFiles };
