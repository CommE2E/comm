// @flow

import * as React from 'react';

import { setAccessTokenActionType } from 'lib/actions/user-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { getOneTimeKeyArray } from 'lib/shared/crypto-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { isValidEthereumAddress } from 'lib/utils/siwe-utils.js';

import { fetchNativeCredentials } from '../account/native-credentials.js';
import { commCoreModule, commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

const ONE_TIME_KEYS_NUMBER = 10;

function IdentityHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const dispatch = useDispatch();

  React.useEffect(() => {
    void (async () => {
      if (loggedIn) {
        await commCoreModule.initializeCryptoAccount();
        const authMetadata = await commCoreModule.getCommServicesAuthMetadata();
        console.log(authMetadata);
        if (authMetadata.accessToken) {
          console.log('CSAT present');
          return;
        }

        const credentials = await fetchNativeCredentials();
        if (!credentials) {
          return;
        }
        const { username, password } = credentials;
        if (!username || isValidEthereumAddress(username)) {
          return;
        }

        const [
          {
            notificationIdentityPublicKeys,
            primaryIdentityPublicKeys,
            signature,
          },
          notificationsOneTimeKeys,
          primaryOneTimeKeys,
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getNotificationsOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.getPrimaryOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.generateAndGetPrekeys(),
        ]);

        const keyPayload = JSON.stringify({
          notificationIdentityPublicKeys,
          primaryIdentityPublicKeys,
        });

        let authResult: ?string = null;

        try {
          authResult = await commRustModule.registerUser(
            username,
            password,
            keyPayload,
            signature,
            prekeys.contentPrekey,
            prekeys.contentPrekeySignature,
            prekeys.notifPrekey,
            prekeys.notifPrekeySignature,
            getOneTimeKeyArray(primaryOneTimeKeys),
            getOneTimeKeyArray(notificationsOneTimeKeys),
          );
          console.log('Registered to identity');
        } catch (registerError) {
          console.log(
            'User PROBABLY already exists, trying to log in: ',
            registerError,
          );
          try {
            authResult = await commRustModule.logInPasswordUser(
              username,
              password,
              keyPayload,
              signature,
              prekeys.contentPrekey,
              prekeys.contentPrekeySignature,
              prekeys.notifPrekey,
              prekeys.notifPrekeySignature,
              getOneTimeKeyArray(primaryOneTimeKeys),
              getOneTimeKeyArray(notificationsOneTimeKeys),
            );
            console.log('Logged in to identity');
          } catch (loginError) {
            console.log('Login error ', loginError);
          }
        }

        if (!authResult) {
          return;
        }
        const { userID, accessToken } = JSON.parse(authResult);
        await commCoreModule.setCommServicesAuthMetadata(
          userID,
          primaryIdentityPublicKeys.ed25519,
          accessToken,
        );
        dispatch({ type: setAccessTokenActionType, payload: accessToken });
        console.log('CSAT set, now Tunnelbroker should be connected');
      } else {
        await commCoreModule.clearCommServicesAccessToken();
        console.log('clearing CSAT');
      }
    })();
  }, [dispatch, loggedIn]);

  return null;
}

export default IdentityHandler;
