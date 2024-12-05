// @flow

import invariant from 'invariant';
import * as React from 'react';

import { identityRestoreActionTypes } from 'lib/actions/user-actions.js';
import { useLogIn } from 'lib/hooks/login-hooks.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  IdentityAuthResult,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { composeRawDeviceList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { useClientBackup } from '../backup/use-client-backup.js';
import { commCoreModule } from '../native-modules.js';

function useRestoreProtocol(): (
  // username or wallet address
  userIdentifier: string,
  // password or SIWE signature
  secret: string,
  // social proof for SIWE restore
  siweMessage?: string,
  siweSignature?: string,
) => Promise<IdentityAuthResult> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { identityClient } = identityContext;
  const { restoreUser } = identityClient;
  invariant(
    restoreUser,
    'restoreUser() should be defined on native.' +
      'Are you calling it on a non-primary device?',
  );

  const preRequestUserState = useSelector(state => state.currentUserInfo);
  const { retrieveLatestBackupInfo, getBackupUserKeys } = useClientBackup();

  return React.useCallback(
    async (
      userIdentifier: string,
      secret: string,
      siweMessage?: string,
      siweSignature?: string,
    ) => {
      //1. Runs Key Generation
      const { olmAPI } = getConfig();
      await olmAPI.initializeCryptoAccount();

      //2. Retrieve User Keys Backup and `userID`
      const { userID, backupID } =
        await retrieveLatestBackupInfo(userIdentifier);
      const { pickledAccount, pickleKey } = await getBackupUserKeys(
        userIdentifier,
        secret,
        backupID,
      );

      //3. Create signed singleton device list
      const primaryDeviceID = await getContentSigningKey();
      const initialDeviceList = composeRawDeviceList([primaryDeviceID]);
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

      //4. Call single RPC, this:
      // - runs Key Upload
      // - send device list to Comm
      // - get new CSAT
      const result = await restoreUser(
        userID,
        signedDeviceList,
        siweMessage,
        siweSignature,
      );

      //5. Mark keys as published
      try {
        await olmAPI.markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }

      //6. Return IdentityAuthResult result
      return {
        ...result,
        preRequestUserState,
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
  siweMessage?: string,
  siweSignature?: string,
) => Promise<void> {
  const restoreProtocol = useRestoreProtocol();
  const dispatchActionPromise = useDispatchActionPromise();
  const restoreAuth = React.useCallback(
    (
      userIdentifier: string,
      secret: string,
      siweMessage?: string,
      siweSignature?: string,
    ) => {
      const promise = restoreProtocol(
        userIdentifier,
        secret,
        siweMessage,
        siweSignature,
      );
      void dispatchActionPromise(identityRestoreActionTypes, promise);
      return promise;
    },
    [dispatchActionPromise, restoreProtocol],
  );

  const logIn = useLogIn();
  return React.useCallback(
    (
      userIdentifier: string,
      secret: string,
      siweMessage?: string,
      siweSignature?: string,
    ) => logIn(restoreAuth(userIdentifier, secret, siweMessage, siweSignature)),
    [logIn, restoreAuth],
  );
}

export { useRestore };
