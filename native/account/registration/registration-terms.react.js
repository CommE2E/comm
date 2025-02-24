// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View, Image, Linking } from 'react-native';

import type { SignedMessage } from 'lib/types/siwe-types.js';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { RegistrationContext } from './registration-context.js';
import type {
  CoolOrNerdMode,
  AccountSelection,
  AvatarData,
} from './registration-types.js';
import PrimaryButton from '../../components/primary-button.react.js';
import commSwooshSource from '../../img/comm-swoosh.png';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { usePreventUserFromLeavingScreen } from '../../navigation/use-prevent-user-from-leaving-screen.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

export type RegistrationTermsParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +farcasterID: ?string,
    +accountSelection: AccountSelection,
    +avatarData: ?AvatarData,
    +siweBackupSecrets?: ?SignedMessage,
    +farcasterAvatarURL: ?string,
  },
};

const onTermsOfUsePressed = () => {
  void Linking.openURL('https://comm.app/terms');
};

const onPrivacyPolicyPressed = () => {
  void Linking.openURL('https://comm.app/privacy');
};

type Props = {
  +navigation: AuthNavigationProp<'RegistrationTerms'>,
  +route: NavigationRoute<'RegistrationTerms'>,
};
function RegistrationTerms(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { register, setCachedSelections } = registrationContext;

  const [registrationInProgress, setRegistrationInProgress] =
    React.useState(false);

  const { userSelections } = props.route.params;

  const clearCachedSelections = React.useCallback(() => {
    setCachedSelections({});
  }, [setCachedSelections]);

  const { navigation } = props;
  const { reconnectEthereum } = navigation;
  const { coolOrNerdMode, keyserverURL, farcasterID, farcasterAvatarURL } =
    userSelections;
  const navigateToConnectEthereum = React.useCallback(() => {
    reconnectEthereum({
      userSelections: {
        coolOrNerdMode,
        keyserverURL,
        farcasterID,
        farcasterAvatarURL,
      },
    });
  }, [
    reconnectEthereum,
    coolOrNerdMode,
    keyserverURL,
    farcasterID,
    farcasterAvatarURL,
  ]);
  const onNonceExpired = React.useCallback(() => {
    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      ethereumAccount: undefined,
    }));
    Alert.alert(
      'Registration attempt timed out',
      'Please try to connect your Ethereum wallet again',
      [{ text: 'OK', onPress: navigateToConnectEthereum }],
      {
        cancelable: false,
      },
    );
  }, [setCachedSelections, navigateToConnectEthereum]);

  const onProceed = React.useCallback(async () => {
    setRegistrationInProgress(true);
    try {
      await register({
        ...userSelections,
        clearCachedSelections,
        onNonceExpired,
      });
    } finally {
      setRegistrationInProgress(false);
    }
  }, [register, userSelections, clearCachedSelections, onNonceExpired]);

  usePreventUserFromLeavingScreen(registrationInProgress);

  const styles = useStyles(unboundStyles);

  const termsNotice = (
    <Text style={styles.body}>
      By registering, you are agreeing to our{' '}
      <Text style={styles.hyperlinkText} onPress={onTermsOfUsePressed}>
        Terms of Use
      </Text>
      {' and '}
      <Text style={styles.hyperlinkText} onPress={onPrivacyPolicyPressed}>
        Privacy Policy
      </Text>
      .
    </Text>
  );

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Finish registration</Text>
        {termsNotice}
        <View style={styles.commSwooshContainer}>
          <Image source={commSwooshSource} style={styles.commSwoosh} />
        </View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onProceed}
          label="Register"
          variant={registrationInProgress ? 'loading' : 'enabled'}
        />
      </AuthButtonContainer>
    </AuthContainer>
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
  commSwooshContainer: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commSwoosh: {
    resizeMode: 'contain',
    width: '100%',
    height: '100%',
  },
  hyperlinkText: {
    color: 'purpleLink',
  },
};

export default RegistrationTerms;
