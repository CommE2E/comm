// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { View } from 'react-native';

import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';

type ViewProps = React.ElementConfig<typeof View>;
type Props = {
  ...ViewProps,
  +children: React.Node,
};
function CommunityCreationContentContainer(props: Props): React.Node {
  const { children, style, ...rest } = props;

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({ marginTop: headerHeight }),
    [headerHeight],
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <View style={backgroundStyle} {...rest}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = {
  fill: {
    flex: 1,
  },
};

export default CommunityCreationContentContainer;
