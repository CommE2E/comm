// @flow

import * as React from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userKeysResponseValidator } from 'lib/types/backup-types.js';
import { type SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { SignSIWEBackupMessageForRestore } from '../account/registration/siwe-backup-message-creation.react.js';
import { commCoreModule } from '../native-modules.js';
import { type RootNavigationProp } from '../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../navigation/route-names.js';
import { persistConfig } from '../redux/persist.js';
import { useStyles } from '../themes/colors.js';

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
  const styles = useStyles(unboundStyles);
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

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      void (async () => {
        const { signature } = result;
        let message = 'success';
        try {
          const userKeysResponse = await commCoreModule.getBackupUserKeys(
            userIdentifier,
            signature,
            backupID,
          );
          const userKeys = assertWithValidator(
            JSON.parse(userKeysResponse),
            userKeysResponseValidator,
          );
          await commCoreModule.restoreBackupData(
            backupID,
            userKeys.backupDataKey,
            userKeys.backupLogDataKey,
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
    [backupID, goBack, userIdentifier],
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <SignSIWEBackupMessageForRestore
        siweNonce={siweNonce}
        siweStatement={siweStatement}
        siweIssuedAt={siweIssuedAt}
        onSkip={goBack}
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
      />
    </SafeAreaView>
  );
}

const safeAreaEdges = ['top'];
const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
  },
};

export default RestoreSIWEBackup;
