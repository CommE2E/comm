// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import { type RootNavigationProp } from '../../navigation/root-navigator.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import SIWEPanel from '../siwe-panel.react.js';

type PanelState = 'closed' | 'opening' | 'open' | 'closing';

type Props = {
  +navigation: RootNavigationProp<'MissingSIWEBackupSecrets'>,
  +route: NavigationRoute<'MissingSIWEBackupSecrets'>,
};

function MissingSIWEBackupSecrets(props: Props): React.Node {
  const secureWithEthereumWalletText = 'Secure with Ethereum Wallet';
  const secureWithEthereumWalletVariant = 'enabled';
  const [panelState, setPanelState] = React.useState<PanelState>('closed');
  const styles = useStyles(unboundStyles);

  const openPanel = React.useCallback(() => {
    setPanelState('opening');
  }, []);
  const onPanelClosed = React.useCallback(() => {
    setPanelState('closed');
  }, []);
  const onPanelClosing = React.useCallback(() => {
    setPanelState('closing');
  }, []);

  const siwePanelSetLoading = React.useCallback(
    (loading: boolean) => {
      if (panelState === 'closing' || panelState === 'closed') {
        return;
      }
      setPanelState(loading ? 'opening' : 'open');
    },
    [panelState],
  );

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

  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        siweMessageType={SIWEMessageTypes.MSG_BACKUP}
        setLoading={siwePanelSetLoading}
      />
    );
  }
  const body = (
    <Text style={styles.body}>
      Comm encrypts user backup so that out backend is not able to see user
      data.
    </Text>
  );

  return (
    <>
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>Encrypting your Comm Backup</Text>
          {body}
        </RegistrationContentContainer>
        <RegistrationButtonContainer>
          <RegistrationButton
            label={secureWithEthereumWalletText}
            variant={secureWithEthereumWalletVariant}
            onPress={openPanel}
          />
        </RegistrationButtonContainer>
      </RegistrationContainer>

      {siwePanel}
    </>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
};

export default MissingSIWEBackupSecrets;
