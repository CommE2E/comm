// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import { type SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { useClientBackup } from './use-client-backup.js';
import { SignSIWEBackupMessageForRestore } from '../account/registration/siwe-backup-message-creation.react.js';
import { commCoreModule } from '../native-modules.js';
import { type RootNavigationProp } from '../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../navigation/route-names.js';
import { persistConfig } from '../redux/persist.js';

export type RestoreSIWEBackupParams = {
  +backupID: string,
  +siweNonce: string,
  +siweStatement: string,
  +siweIssuedAt: string,
  +userIdentifier: string,
};

type Props = {
  +navigation: RootNavigationProp<'RestoreSIWEBackup'>,
  +route: NavigationRoute<'RestoreSIWEBackup'>,
};

function RestoreSIWEBackup(props: Props): React.Node {
  const { goBack } = props.navigation;
  const { route } = props;
  const {
    params: {
      backupID,
      siweStatement,
      siweIssuedAt,
      siweNonce,
      userIdentifier,
    },
  } = route;

  const { getBackupUserKeys } = useClientBackup();

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      void (async () => {
        const { signature } = result;
        let message = 'success';
        try {
          const { backupDataKey, backupLogDataKey } = await getBackupUserKeys(
            userIdentifier,
            signature,
            backupID,
          );
          await commCoreModule.restoreBackupData(
            backupID,
            backupDataKey,
            backupLogDataKey,
            persistConfig.version.toString(),
          );
        } catch (e) {
          message = `Backup restore error: ${String(
            getMessageForException(e),
          )}`;
          console.error(message);
        }
        Alert.alert('Restore protocol result', message);
        goBack();
      })();
    },
    [backupID, getBackupUserKeys, goBack, userIdentifier],
  );

  return (
    <SignSIWEBackupMessageForRestore
      siweNonce={siweNonce}
      siweStatement={siweStatement}
      siweIssuedAt={siweIssuedAt}
      onSkip={goBack}
      onSuccessfulWalletSignature={onSuccessfulWalletSignature}
    />
  );
}

export default RestoreSIWEBackup;
