// @flow

import invariant from 'invariant';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type SIWEResult } from 'lib/types/siwe-types.js';

import { type RootNavigationProp } from '../../../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../../../navigation/route-names.js';
import { useStyles } from '../../../themes/colors.js';
import { RegistrationContext } from '../registration-context.js';
import { CreateSIWEBackupMessageBase } from '../siwe-backup-message-creation.react.js';

type Props = {
  +navigation: RootNavigationProp<'CreateMissingSIWEBackupMessage'>,
  +route: NavigationRoute<'CreateMissingSIWEBackupMessage'>,
};

function CreateMissingSIWEBackupMessage(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { siweBackupSecrets, setSIWEBackupSecrets } = registrationContext;

  const onSuccessfulWalletSignature = React.useCallback(
    async (result: SIWEResult) => {
      const { message, signature } = result;
      setSIWEBackupSecrets({
        message,
        signature,
      });
    },
    [setSIWEBackupSecrets],
  );

  React.useEffect(() => {
    if (siweBackupSecrets) {
      props.navigation.goBack();
    }
  }, [siweBackupSecrets, props]);

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <CreateSIWEBackupMessageBase
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

export default CreateMissingSIWEBackupMessage;
