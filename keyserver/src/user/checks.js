// @flow

import { getCommConfig } from 'lib/utils/comm-config.js';
type UserCredentials = { +username: string, +password: string };

async function ensureUserCredentials() {
  const userCredentials = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  if (!userCredentials) {
    console.log(
      'User credentials for the keyserver owner must be specified. They can be ' +
        'specified either by setting the ' +
        '`COMM_JSONCONFIG_secrets_user_credentials` environmental variable, or by ' +
        'setting a file at keyserver/secrets/user_credentials.json. The contents ' +
        'should be a JSON blob that looks like this:\n' +
        '{\n' +
        '  "username": <user>,\n' +
        '  "password": <pass>\n' +
        '}\n',
    );

    // Since we don't want to apply the migration until there are credentials;
    // throw the error and force keyserver to be configured next restart
    throw new Error('User credentials not found');
  }
}

export { ensureUserCredentials };
