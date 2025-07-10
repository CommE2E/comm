// @flow

import { useHeaderHeight } from '@react-navigation/elements';
import * as React from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

type ViewProps = React.ElementConfig<typeof View>;
type Props = ViewProps;

function CommunityCreationContentContainer(props: Props): React.Node {
  const { children, style, ...rest } = props;

  const headerHeight = useHeaderHeight();
  const backgroundStyle = React.useMemo(
    () => ({ marginTop: headerHeight, flex: 1 }),
    [headerHeight],
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={backgroundStyle} {...rest}>
      {children}
    </KeyboardAvoidingView>
  );
}

export default CommunityCreationContentContainer;
