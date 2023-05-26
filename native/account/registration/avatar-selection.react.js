// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { SIWEResult } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type EthereumAccountSelections = {
  +accountType: 'ethereum',
  ...SIWEResult,
};

type UsernameAccountSelections = {
  +accountType: 'username',
  +username: string,
  +password: string,
};

export type AvatarSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
    +accountSelections: EthereumAccountSelections | UsernameAccountSelections,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'AvatarSelection'>,
  +route: NavigationRoute<'AvatarSelection'>,
};
// eslint-disable-next-line no-unused-vars
function AvatarSelection(props: Props): React.Node {
  const onProceed = React.useCallback(() => {}, []);

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Pick an avatar</Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Next"
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

export default AvatarSelection;
