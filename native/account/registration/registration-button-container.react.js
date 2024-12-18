// @flow

import * as React from 'react';
import { View } from 'react-native';

type Props = {
  +children: React.Node,
};
function AuthButtonContainer(props: Props): React.Node {
  return <View style={styles.container}>{props.children}</View>;
}

const styles = {
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
};

export default AuthButtonContainer;
