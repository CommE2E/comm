// @flow

import * as React from 'react';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';

import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type KeyserverSelectionBottomSheetParams = {
  +keyserverAdminUsername: string,
  +keyserverInfo: KeyserverInfo,
};

type Props = {
  +navigation: RootNavigationProp<'KeyserverSelectionBottomSheet'>,
  +route: NavigationRoute<'KeyserverSelectionBottomSheet'>,
};

function KeyserverSelectionBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef();

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      {null}
    </BottomSheet>
  );
}

export default KeyserverSelectionBottomSheet;
