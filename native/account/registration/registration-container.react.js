// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { ScrollView } from 'react-native';

import KeyboardAvoidingView from '../../components/keyboard-avoiding-view.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +children: React.Node,
};
function RegistrationContainer(props: Props): React.Node {
  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({
      marginTop: headerHeight,
    }),
    [headerHeight],
  );

  const styles = useStyles(unboundStyles);
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={backgroundStyle}
      >
        {props.children}
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
