// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import AuthButtonContainer from './registration/registration-button-container.react.js';
import AuthContainer from './registration/registration-container.react.js';
import AuthContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import { useSIWEPanelState } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import type { NavigationRoute } from '../navigation/route-names';
import { RestorePasswordAccountScreenRouteName } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
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
