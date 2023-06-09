// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View, Image, Linking } from 'react-native';

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
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type RegistrationTermsParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
    +accountSelection: AccountSelection,
    +avatarData: ?AvatarData,
  },
};

const onTermsOfUsePressed = () => {
  Linking.openURL('https://comm.app/terms');
};

const onPrivacyPolicyPressed = () => {
  Linking.openURL('https://comm.app/privacy');
};

type Props = {
  +navigation: RegistrationNavigationProp<'RegistrationTerms'>,
  +route: NavigationRoute<'RegistrationTerms'>,
};
function RegistrationTerms(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { register } = registrationContext;

  const [registrationInProgress, setRegistrationInProgress] =
    React.useState(false);

  const { userSelections } = props.route.params;
  const onProceed = React.useCallback(async () => {
    setRegistrationInProgress(true);
    try {
      await register(userSelections);
    } finally {
      setRegistrationInProgress(false);
    }
  }, [register, userSelections]);

  const styles = useStyles(unboundStyles);

  /* eslint-disable react-native/no-raw-text */
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
  /* eslint-enable react-native/no-raw-text */

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Finish registration</Text>
        {termsNotice}
        <View style={styles.commSwooshContainer}>
          <Image source={commSwooshSource} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  hyperlinkText: {
    color: 'purpleLink',
  },
};

export default RegistrationTerms;
