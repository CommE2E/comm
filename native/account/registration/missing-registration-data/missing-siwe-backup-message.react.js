// @flow

import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type SIWEResult } from 'lib/types/siwe-types.js';

import { commCoreModule } from '../../../native-modules.js';
import { type RootNavigationProp } from '../../../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../../../navigation/route-names.js';
import { useStyles } from '../../../themes/colors.js';
import { CreateSIWEBackupMessageBase } from '../siwe-backup-message-creation.react.js';

type Props = {
  +navigation: RootNavigationProp<'CreateMissingSIWEBackupMessage'>,
  +route: NavigationRoute<'CreateMissingSIWEBackupMessage'>,
};

function CreateMissingSIWEBackupMessage(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const [siweBackupSecretsPersisted, setSIWEBackupSecretsPersisted] =
    React.useState<boolean>(false);

  const [skippedByUser, setSkippedByUser] = React.useState<boolean>(false);

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      void (async () => {
        const { message, signature } = result;
        await commCoreModule.setSIWEBackupSecrets({ message, signature });
        setSIWEBackupSecretsPersisted(true);
      })();
    },
    [setSIWEBackupSecretsPersisted],
  );

  const onSkip = React.useCallback(() => {
    setSkippedByUser(true);
  }, []);

  React.useEffect(() => {
    if (siweBackupSecretsPersisted || skippedByUser) {
      props.navigation.goBack();
    }
  }, [siweBackupSecretsPersisted, props, skippedByUser]);

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <CreateSIWEBackupMessageBase
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        onSkip={onSkip}
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

export default CreateMissingSIWEBackupMessage;
