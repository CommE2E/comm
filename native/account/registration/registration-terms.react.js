// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View, Image, Linking, Alert } from 'react-native';

import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  AccountSelection,
  AvatarData,
} from './registration-types.js';
import commSwooshSource from '../../img/comm-swoosh.png';
import { logInActionType } from '../../navigation/action-types.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import type {
  NavigationRoute,
  ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type RegistrationTermsParams = {
  +userSelections: {
    +coolOrNerdMode?: CoolOrNerdMode,
    +keyserverURL?: string,
    +farcasterID: ?string,
    +accountSelection: AccountSelection,
    +avatarData: ?AvatarData,
    +siweBackupSecrets?: ?SIWEBackupSecrets,
  },
};

const onTermsOfUsePressed = () => {
  void Linking.openURL('https://comm.app/terms');
};

const onPrivacyPolicyPressed = () => {
  void Linking.openURL('https://comm.app/privacy');
};

type Props = {
  +navigation: RegistrationNavigationProp<'RegistrationTerms'>,
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
  const goBackToHome = navigation.getParent<
    ScreenParamList,
    'Registration',
    StackNavigationState,
    StackOptions,
    StackNavigationEventMap,
    RootNavigationProp<'Registration'>,
  >()?.goBack;
  const onNonceExpired = React.useCallback(() => {
    Alert.alert(
      'Login attempt timed out',
      'Try logging in from the main SIWE button on the home screen',
      [{ text: 'OK', onPress: goBackToHome }],
      {
        cancelable: false,
      },
    );
  }, [goBackToHome]);

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

  React.useEffect(() => {
    if (!registrationInProgress) {
      return undefined;
    }
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: null,
    });
    const removeListener = navigation.addListener('beforeRemove', e => {
      if (e.data.action.type !== logInActionType) {
        e.preventDefault();
      }
    });
    return () => {
      navigation.setOptions({
        gestureEnabled: true,
        headerLeft: undefined,
      });
      removeListener();
    };
  }, [navigation, registrationInProgress]);

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
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Finish registration</Text>
        {termsNotice}
        <View style={styles.commSwooshContainer}>
          <Image source={commSwooshSource} style={styles.commSwoosh} />
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Register"
          variant={registrationInProgress ? 'loading' : 'enabled'}
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
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
    resizeMode: 'center',
    width: '100%',
    height: '100%',
  },
  hyperlinkText: {
    color: 'purpleLink',
  },
};

export default RegistrationTerms;
