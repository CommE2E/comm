// @flow

import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStyles } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';

const safeAreaEdges = ['bottom'];

type Props = {
  +children: React.Node,
  +style?: ViewStyle,
};
function AuthContainer(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const style = React.useMemo(
    () => [styles.container, props.style],
    [styles.container, props.style],
  );
  return (
    <SafeAreaView style={style} edges={safeAreaEdges}>
      {props.children}
    </SafeAreaView>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
  },
};

export default AuthContainer;
