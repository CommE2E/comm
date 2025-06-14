// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import AuthButtonContainer from './auth-components/auth-button-container.react.js';
import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import PromptButton from './prompt-button.react.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import { useV1Login } from './restore.js';
import { useSIWEPanelState } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import type { NavigationRoute } from '../navigation/route-names';
import {
  RestoreSIWEBackupRouteName,
  RestorePasswordAccountScreenRouteName,
} from '../navigation/route-names.js';
import { usePreventUserFromLeavingScreen } from '../navigation/use-prevent-user-from-leaving-screen.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  networkErrorAlertDetails,
  unknownErrorAlertDetails,
  backupInfoFetchErrorAlertDetails,
  siweLoginErrorAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import RestoreIcon from '../vectors/restore-icon.react.js';

type Props = {
  +navigation: AuthNavigationProp<'RestorePromptScreen'>,
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

  const [authInProgress, setAuthInProgress] = React.useState(false);
  const { retrieveLatestBackupInfo } = useClientBackup();
  const performV1Login = useV1Login();
  const onSIWESuccess = React.useCallback(
    async (result: SIWEResult) => {
      let step;
      try {
        step = 'fetch_backup_info';
        setAuthInProgress(true);
        const { address, signature, message } = result;
        const backupInfo = await retrieveLatestBackupInfo(address);
        if (!backupInfo) {
          step = 'v1_login';
          await performV1Login(address, {
            type: 'siwe',
            socialProof: { message, signature },
          });
          return;
        }
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
        let alertDetails = unknownErrorAlertDetails;
        if (
          messageForException === 'unsupported_version' ||
          messageForException === 'client_version_unsupported' ||
          messageForException === 'use_new_flow'
        ) {
          alertDetails = appOutOfDateAlertDetails;
        } else if (messageForException === 'nonce_expired') {
          alertDetails = {
            title: 'Login attempt timed out',
            message: 'Please try again',
          };
        } else if (messageForException === 'network_error') {
          alertDetails = networkErrorAlertDetails;
        } else if (step === 'fetch_backup_info') {
          alertDetails = backupInfoFetchErrorAlertDetails;
        } else if (step === 'v1_login') {
          alertDetails = siweLoginErrorAlertDetails;
        }
        Alert.alert(
          alertDetails.title,
          alertDetails.message,
          [{ text: 'OK' }],
          { cancelable: false },
        );
      } finally {
        setAuthInProgress(false);
      }
    },
    [performV1Login, props.navigation, retrieveLatestBackupInfo],
  );

  usePreventUserFromLeavingScreen(authInProgress);

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

  const openSIWEPanel = React.useCallback(() => {
    if (!authInProgress) {
      openPanel();
    }
  }, [authInProgress, openPanel]);

  const colors = useColors();
  return (
    <>
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
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
        </AuthContentContainer>
        <AuthButtonContainer>
          <View style={styles.buttonContainer}>
            <PromptButton
              text="Restore with Ethereum"
              onPress={openSIWEPanel}
              variant={
                panelState === 'opening' || authInProgress ? 'loading' : 'siwe'
              }
            />
          </View>
          <View style={styles.buttonContainer}>
            <PromptButton
              text="Restore with password"
              onPress={openPasswordRestoreScreen}
              variant="enabled"
            />
          </View>
        </AuthButtonContainer>
      </AuthContainer>
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
