// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../themes/colors.js';

function BottomSheetHandle(): React.Node {
  const styles = useStyles(unboundStyles);

  const bottomSheetHandle = React.useMemo(
    () => (
      <>
        <View style={styles.knobHandleContainer}>
          <View style={styles.knobHandle} />
        </View>
        <View style={styles.gap} />
      </>
    ),
    [styles.gap, styles.knobHandle, styles.knobHandleContainer],
  );

  return bottomSheetHandle;
}

const unboundStyles = {
  knobHandleContainer: {
    marginTop: -12,
  },
  knobHandle: {
    width: 64,
    height: 4,
    backgroundColor: 'modalKnob',
    alignSelf: 'center',
    borderRadius: 4,
  },
  gap: {
    height: 32,
  },
};

export default BottomSheetHandle;
