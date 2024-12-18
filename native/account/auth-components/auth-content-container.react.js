// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { ScrollView } from 'react-native';

import KeyboardAvoidingView from '../../components/keyboard-avoiding-view.react.js';

type ViewProps = React.ElementConfig<typeof ScrollView>;
type Props = {
  ...ViewProps,
  +children: React.Node,
};
function AuthContentContainer(props: Props): React.Node {
  const { children, style, ...rest } = props;

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({
      marginTop: headerHeight,
    }),
    [headerHeight],
  );

  const contentContainerStyle = React.useMemo(
    () => [styles.scrollViewContentContainer, style],
    [style],
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        style={backgroundStyle}
        alwaysBounceVertical={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  fill: {
    flex: 1,
  },
  scrollViewContentContainer: {
    padding: 16,
  },
};

export default AuthContentContainer;
