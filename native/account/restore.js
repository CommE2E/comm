// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  IdentityAuthResult,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { composeRawDeviceList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { useClientBackup } from '../backup/use-client-backup.js';
import { commCoreModule } from '../native-modules.js';

function useIdentityRestore(): (
  username: string,
  password: string,
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
      username: string,
      password: string,
      siweMessage?: string,
      siweSignature?: string,
    ) => {
      //1. Runs Key Generation
      const { olmAPI } = getConfig();
      await olmAPI.initializeCryptoAccount();

      //2. Retrieve User Keys Backup and `userID`
      const { userID, backupID } = await retrieveLatestBackupInfo(username);
      const { pickledAccount, pickleKey } = await getBackupUserKeys(
        username,
        password,
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

export { useIdentityRestore };
