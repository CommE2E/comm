// @flow

import * as React from 'react';
import { Text } from 'react-native';

import RegistrationContainer from './registration-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +navigation: RegistrationNavigationProp<'KeyserverSelection'>,
  +route: NavigationRoute<'KeyserverSelection'>,
};
// eslint-disable-next-line no-unused-vars
function KeyserverSelection(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <Text style={styles.testText}>Test Hello Test</Text>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  testText: {
    fontSize: 24,
    color: 'white',
  },
};

export default KeyserverSelection;
