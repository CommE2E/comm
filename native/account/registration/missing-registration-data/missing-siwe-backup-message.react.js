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
  const { goBack } = props.navigation;

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      void (async () => {
        const { message, signature } = result;
        await commCoreModule.setSIWEBackupSecrets({ message, signature });
        goBack();
      })();
    },
    [goBack],
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <CreateSIWEBackupMessageBase
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        onSkip={goBack}
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
