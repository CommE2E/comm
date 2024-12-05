// @flow

import MaterialIcon from '@expo/vector-icons/MaterialCommunityIcons.js';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import { useSIWEPanelState } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import type { NavigationRoute } from '../navigation/route-names';
import { RestorePasswordAccountScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePromptScreen'>,
  +route: NavigationRoute<'RestorePromptScreen'>,
};

function RestorePromptScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const openPasswordRestoreScreen = React.useCallback(() => {
    props.navigation.navigate(RestorePasswordAccountScreenRouteName);
  }, [props.navigation]);

  const siweSignatureRequestData = React.useMemo(
    () => ({
      messageType: 'msg_auth',
    }),
    [],
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
        onSuccessfulWalletSignature={() => {}}
        siweSignatureRequestData={siweSignatureRequestData}
        setLoading={siwePanelSetLoading}
      />
    );
  }

  let activityIndicator = null;
  if (panelState === 'opening') {
    activityIndicator = (
      <View style={styles.loadingContainer}>
        <View style={styles.backdrop} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
            <MaterialIcon name="backup-restore" size={200} color="white" />
          </View>
        </RegistrationContentContainer>
        <RegistrationButtonContainer>
          <View style={styles.buttonContainer}>
            <PromptButton
              text="Restore with Ethereum"
              onPress={openPanel}
              variant="siwe"
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
      {activityIndicator}
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: 'black',
    opacity: 0.6,
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
};

export default RestorePromptScreen;
