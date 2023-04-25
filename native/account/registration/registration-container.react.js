// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { ScrollView } from 'react-native';

import KeyboardAvoidingView from '../../components/keyboard-avoiding-view.react.js';
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
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        style={backgroundStyle}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
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
