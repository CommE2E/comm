// @flow

import * as React from 'react';
import { View } from 'react-native';

import {
  knobHandleContainerMarginTop,
  knobHandleHeight,
  handleGap,
} from './bottom-sheet-constants.js';
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
    marginTop: knobHandleContainerMarginTop,
  },
  knobHandle: {
    width: 64,
    height: knobHandleHeight,
    backgroundColor: 'modalKnob',
    alignSelf: 'center',
    borderRadius: 4,
  },
  gap: {
    height: handleGap,
  },
};

export default BottomSheetHandle;
