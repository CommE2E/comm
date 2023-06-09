// @flow

import * as React from 'react';
import { Text } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
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
// eslint-disable-next-line no-unused-vars
function RegistrationTerms(props: Props): React.Node {
  const onProceed = React.useCallback(() => {}, []);

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
          variant="disabled"
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
