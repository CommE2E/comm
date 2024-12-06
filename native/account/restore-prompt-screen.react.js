// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import { useSIWEPanelState } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import type { NavigationRoute } from '../navigation/route-names';
import {
  RestoreSIWEBackupRouteName,
  RestorePasswordAccountScreenRouteName,
} from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import RestoreIcon from '../vectors/restore-icon.react.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePromptScreen'>,
  +route: NavigationRoute<'RestorePromptScreen'>,
};

const siweSignatureRequestData = {
  messageType: 'msg_auth',
};

function RestorePromptScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const openPasswordRestoreScreen = React.useCallback(() => {
    props.navigation.navigate(RestorePasswordAccountScreenRouteName);
  }, [props.navigation]);

  const { retrieveLatestBackupInfo } = useClientBackup();
  const onSIWESuccess = React.useCallback(
    async (result: SIWEResult) => {
      try {
        const { address, signature, message } = result;
        const backupInfo = await retrieveLatestBackupInfo(address);
        const { siweBackupData } = backupInfo;

        if (!siweBackupData) {
          throw new Error('Missing SIWE message for Wallet user backup');
        }

        const {
          siweBackupMsgNonce,
          siweBackupMsgIssuedAt,
          siweBackupMsgStatement,
        } = siweBackupData;

        props.navigation.navigate(RestoreSIWEBackupRouteName, {
          siweNonce: siweBackupMsgNonce,
          siweStatement: siweBackupMsgStatement,
          siweIssuedAt: siweBackupMsgIssuedAt,
          userIdentifier: address,
          signature,
          message,
        });
      } catch (e) {
        const messageForException = getMessageForException(e);
        console.log(
          `SIWE restore error: ${messageForException ?? 'unknown error'}`,
        );
        const alertDetails = unknownErrorAlertDetails;
        Alert.alert(
          alertDetails.title,
          alertDetails.message,
          [{ text: 'OK', onPress: props.navigation.goBack }],
          { cancelable: false },
        );
      }
    },
    [props.navigation, retrieveLatestBackupInfo],
  );

  const {
    panelState,
    openPanel,
    onPanelClosed,
    onPanelClosing,
    siwePanelSetLoading,
  } = useSIWEPanelState();
  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        onSuccessfulWalletSignature={onSIWESuccess}
        siweSignatureRequestData={siweSignatureRequestData}
        setLoading={siwePanelSetLoading}
      />
    );
  }

  const colors = useColors();
  return (
    <>
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>Restore account</Text>
          <Text style={styles.section}>
            If you’ve lost access to your primary device, you can try recovering
            your Comm account.
          </Text>
          <Text style={styles.section}>
            To proceed, select the same login method that you used during
            registration.
          </Text>
          <Text style={styles.section}>
            Note that after completing the recovery flow, you will be logged out
            from all of your other devices.
          </Text>
          <View style={styles.iconContainer}>
            <RestoreIcon color={colors.panelForegroundIcon} />
          </View>
        </RegistrationContentContainer>
        <RegistrationButtonContainer>
          <View style={styles.buttonContainer}>
            <PromptButton
              text="Restore with Ethereum"
              onPress={openPanel}
              variant={panelState === 'opening' ? 'loading' : 'siwe'}
            />
          </View>
          <View style={styles.buttonContainer}>
            <PromptButton
              text="Restore with password"
              onPress={openPasswordRestoreScreen}
              variant="enabled"
            />
          </View>
        </RegistrationButtonContainer>
      </RegistrationContainer>
      {siwePanel}
    </>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  section: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  iconContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default RestorePromptScreen;
