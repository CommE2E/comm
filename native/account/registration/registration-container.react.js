// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { useStyles } from '../../themes/colors.js';

type ViewProps = React.ElementConfig<typeof ScrollView>;
type Props = {
  ...ViewProps,
  +children: React.Node,
};
function RegistrationContainer(props: Props): React.Node {
  const { children, style, ...rest } = props;

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({
      marginTop: headerHeight,
    }),
    [headerHeight],
  );

  const styles = useStyles(unboundStyles);
  const contentContainerStyle = React.useMemo(
    () => [styles.scrollViewContentContainer, style],
    [styles.scrollViewContentContainer, style],
  );

  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      style={backgroundStyle}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    padding: 16,
  },
};

export default RegistrationContainer;
