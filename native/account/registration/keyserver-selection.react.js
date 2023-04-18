// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { View, Text } from 'react-native';

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

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({
      ...styles.background,
      marginTop: headerHeight,
    }),
    [headerHeight, styles.background],
  );

  return (
    <View style={backgroundStyle}>
      <Text style={styles.testText}>Test Hello Test</Text>
    </View>
  );
}

const unboundStyles = {
  background: {
    backgroundColor: 'panelBackground',
  },
  testText: {
    fontSize: 24,
    color: 'white',
  },
};

export default KeyserverSelection;
