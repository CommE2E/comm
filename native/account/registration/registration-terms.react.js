// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

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
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Finish registration</Text>
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
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
};

export default RegistrationTerms;
