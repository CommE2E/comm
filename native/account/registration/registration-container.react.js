// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStyles } from '../../themes/colors.js';

const safeAreaEdges = ['bottom'];

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
    <SafeAreaView style={styles.fill} edges={safeAreaEdges}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        style={backgroundStyle}
        {...rest}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const unboundStyles = {
  fill: {
    flex: 1,
  },
  scrollViewContentContainer: {
    padding: 16,
  },
};

export default RegistrationContainer;
