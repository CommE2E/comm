// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

function useGetBackupSecretForLoggedInUser(): () => Promise<string> {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const loggedIn = useSelector(isLoggedIn);

  return React.useCallback(async () => {
    if (!loggedIn || !currentUserInfo) {
      throw new Error('Attempt to get backup secret for not logged in user');
    }

    if (accountHasPassword(currentUserInfo)) {
      const nativeCredentials = await fetchNativeKeychainCredentials();
      if (!nativeCredentials) {
        throw new Error('Native credentials are missing');
      }
      return nativeCredentials.password;
    }

    const siweBackupSecrets = await commCoreModule.getSIWEBackupSecrets();
    if (!siweBackupSecrets) {
      throw new Error('SIWE backup message and its signature are missing');
    }
    return siweBackupSecrets.signature;
  }, [loggedIn, currentUserInfo]);
}

export { useGetBackupSecretForLoggedInUser };
