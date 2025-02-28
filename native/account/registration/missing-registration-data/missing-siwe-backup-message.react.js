// @flow

import invariant from 'invariant';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type SIWEResult } from 'lib/types/siwe-types.js';
import { isValidEthereumAddress } from 'lib/utils/siwe-utils.js';

import { useScheduleBackup } from '../../../backup/backup-handler-context.js';
import { commCoreModule } from '../../../native-modules.js';
import { type RootNavigationProp } from '../../../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../../../navigation/route-names.js';
import { useSelector } from '../../../redux/redux-utils.js';
import { useStyles } from '../../../themes/colors.js';
import Alert from '../../../utils/alert.js';
import { CreateSIWEBackupMessageBase } from '../siwe-backup-message-creation.react.js';

type Props = {
  +navigation: RootNavigationProp<'CreateMissingSIWEBackupMessage'>,
  +route: NavigationRoute<'CreateMissingSIWEBackupMessage'>,
};

function CreateMissingSIWEBackupMessage(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { goBack } = props.navigation;
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const loggedInEthereumAccountAddress = currentUserInfo?.username;

  invariant(
    loggedInEthereumAccountAddress &&
      isValidEthereumAddress(loggedInEthereumAccountAddress),
    'current username must be valid ethereum address to attempt ' +
      'backup message generation',
  );

  const scheduleBackup = useScheduleBackup();
  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      void (async () => {
        const { message, signature, address } = result;
        if (loggedInEthereumAccountAddress !== address) {
          Alert.alert(
            'Mismatched Ethereum address',
            'You picked a different wallet than the one you use to sign in.',
          );
          return;
        }

        await commCoreModule.setSIWEBackupSecrets({ message, signature });
        scheduleBackup();
        goBack();
      })();
    },
    [goBack, loggedInEthereumAccountAddress, scheduleBackup],
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
