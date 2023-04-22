// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../themes/colors.js';

type Props = {
  +children: React.Node,
};
function RegistrationContainer(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({
      ...styles.background,
      marginTop: headerHeight,
    }),
    [headerHeight, styles.background],
  );

  return <View style={backgroundStyle}>{props.children}</View>;
}

const unboundStyles = {
  background: {
    backgroundColor: 'panelBackground',
    padding: 16,
  },
};

export default RegistrationContainer;
