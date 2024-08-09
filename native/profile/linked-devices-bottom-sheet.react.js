// @flow

import * as React from 'react';
import { View } from 'react-native';

import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { BottomSheetRef } from '../types/bottom-sheet.js';

type Props = {
  +navigation: RootNavigationProp<'LinkedDevicesBottomSheet'>,
  +route: NavigationRoute<'LinkedDevicesBottomSheet'>,
};

function LinkedDevicesBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef<?BottomSheetRef>();

  const styles = useStyles(unboundStyles);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      <View style={styles.container}></View>
    </BottomSheet>
  );
}

const unboundStyles = {
  container: {
    paddingHorizontal: 16,
  },
};

export default LinkedDevicesBottomSheet;
