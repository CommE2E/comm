// @flow

import * as React from 'react';

import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RootNavigationProp<'ConnectFarcasterBottomSheet'>,
  +route: NavigationRoute<'ConnectFarcasterBottomSheet'>,
};

function ConnectFarcasterBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef(null);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      {null}
    </BottomSheet>
  );
}

export default ConnectFarcasterBottomSheet;
