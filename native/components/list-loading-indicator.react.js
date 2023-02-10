// @flow

import * as React from 'react';
import { ActivityIndicator } from 'react-native';

import { useStyles, useColors } from '../themes/colors.js';

function ListLoadingIndicator(): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const { listBackgroundLabel } = colors;
  return (
    <ActivityIndicator
      color={listBackgroundLabel}
      size="large"
      style={styles.loadingIndicator}
    />
  );
}

const unboundStyles = {
  loadingIndicator: {
    backgroundColor: 'listBackground',
    flex: 1,
    padding: 10,
  },
};

export default ListLoadingIndicator;
