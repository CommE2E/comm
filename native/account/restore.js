// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Platform } from 'react-native';

import {
  restoreUserActionTypes,
  type RestoreUserResult,
} from 'lib/actions/user-actions.js';
import {
  useLogIn,
  usePasswordLogIn,
  useWalletLogIn,
} from 'lib/hooks/login-hooks.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { SignedDeviceList } from 'lib/types/identity-service-types.js';
import { platformToIdentityDeviceType } from 'lib/types/identity-service-types.js';
import type { SignedMessage } from 'lib/types/siwe-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { composeRawDeviceList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { setNativeCredentials } from './native-credentials.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import { commCoreModule } from '../native-modules.js';
import { codeVersion, persistConfig } from '../redux/persist.js';

function useRestoreProtocol(): (
  // username or wallet address
  userIdentifier: string,
  // password or SIWE signature
  secret: string,
  // social proof for SIWE restore
  siweSocialProof?: SignedMessage,
) => Promise<RestoreUserResult> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { identityClient } = identityContext;
  const { restoreUser } = identityClient;
  invariant(
    restoreUser,
    'restoreUser() should be defined on native. ' +
      'Are you calling it on a non-primary device?',
  );

  const preRequestUserState = useSelector(state => state.currentUserInfo);
  const { retrieveLatestBackupInfo, getBackupUserKeys } = useClientBackup();

  return React.useCallback(
    async (
      userIdentifier: string,
      secret: string,
      siweSocialProof?: SignedMessage,
    ) => {
      //1. Runs Key Generation
      const { olmAPI } = getConfig();
      await olmAPI.initializeCryptoAccount();

      //2. Retrieve User Keys Backup and `userID`
      const latestBackupInfo = await retrieveLatestBackupInfo(userIdentifier);
      if (!latestBackupInfo) {
        throw new Error('Backup not found');
      }
      const { userID, backupID, keyserverDeviceID } = latestBackupInfo;

      const { pickledAccount, pickleKey, backupDataKey, backupLogDataKey } =
        await getBackupUserKeys(userIdentifier, secret, backupID);

      //3. Set User Data keys to keep using the previous User Data keys.
      // It is required to upload User Keys during restoring RPC
      // and be able to restore again even if User Data upload fails
      // (which is not part of a single RPC).
      await commCoreModule.setUserDataKeys(backupDataKey, backupLogDataKey);

      //4. Create signed singleton device list
      const primaryDeviceID = await getContentSigningKey();
      const devices = keyserverDeviceID
        ? [primaryDeviceID, keyserverDeviceID]
        : [primaryDeviceID];
      const initialDeviceList = composeRawDeviceList(devices);
      const rawDeviceList = JSON.stringify(initialDeviceList);
      const [curPrimarySignature, lastPrimarySignature] = await Promise.all([
        olmAPI.signMessage(rawDeviceList),
        commCoreModule.signMessageUsingAccount(
          rawDeviceList,
          pickledAccount,
          pickleKey,
        ),
      ]);
      const signedDeviceList: SignedDeviceList = {
        rawDeviceList,
        curPrimarySignature,
        lastPrimarySignature,
      };

      //5. Call single RPC, this:
      // - runs Key Upload
      // - send device list to Comm
      // - create User Keys backup
      // - get new CSAT
      const result = await restoreUser(
        userID,
        signedDeviceList,
        siweSocialProof,
        secret,
      );

      //6. Mark keys as published
      try {
        await olmAPI.markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }

      //7. Return the result
      const platformDetails = {
        deviceType: platformToIdentityDeviceType[Platform.OS],
        codeVersion,
        stateVersion: persistConfig.version,
      };
      return {
        ...result,
        preRequestUserState,
        deviceLists: { [userID]: initialDeviceList },
        usersPlatformDetails: {
          [userID]: {
            [primaryDeviceID]: platformDetails,
          },
        },
      };
    },
    [
      getBackupUserKeys,
      preRequestUserState,
      restoreUser,
      retrieveLatestBackupInfo,
    ],
  );
}

function useRestore(): (
  userIdentifier: string,
  secret: string,
  siweSocialProof?: SignedMessage,
) => Promise<void> {
  const restoreProtocol = useRestoreProtocol();
  const dispatchActionPromise = useDispatchActionPromise();
  const restoreAuth = React.useCallback(
    (
      userIdentifier: string,
      secret: string,
      siweSocialProof?: SignedMessage,
    ) => {
      const promise = restoreProtocol(userIdentifier, secret, siweSocialProof);
      void dispatchActionPromise(restoreUserActionTypes, promise);
      return promise;
    },
    [dispatchActionPromise, restoreProtocol],
  );

  const logIn = useLogIn('restore');
  return React.useCallback(
    (userIdentifier: string, secret: string, siweSocialProof?: SignedMessage) =>
      logIn(restoreAuth(userIdentifier, secret, siweSocialProof)),
    [logIn, restoreAuth],
  );
}

function useV1Login(): (
  userIdentifier: string,
  credentials:
    | {
        +type: 'password',
        +password: string,
      }
    | { +type: 'siwe', +socialProof: SignedMessage, ... },
) => Promise<void> {
  const identityPasswordLogIn = usePasswordLogIn();
  const walletLogIn = useWalletLogIn();
  return React.useCallback(
    async (userIdentifier, credentials) => {
      console.log('Performing a V1 login fallback');
      if (credentials.type === 'password') {
        await identityPasswordLogIn(userIdentifier, credentials.password);
        await setNativeCredentials({
          username: userIdentifier,
          password: credentials.password,
        });
      } else {
        await walletLogIn(
          userIdentifier,
          credentials.socialProof.message,
          credentials.socialProof.signature,
        );
      }
    },
    [identityPasswordLogIn, walletLogIn],
  );
}

export { useRestore, useV1Login };
