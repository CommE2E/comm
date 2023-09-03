// @flow

import * as React from 'react';

import type { AccountUserInfo } from 'lib/types/user-types.js';

import BottomSheet from './bottom-sheet.react.js';
import UserProfile from '../components/user-profile.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type UserProfileBottomSheetParams = {
  +userInfo: AccountUserInfo,
};

type Props = {
  +navigation: RootNavigationProp<'UserProfileBottomSheet'>,
  +route: NavigationRoute<'UserProfileBottomSheet'>,
};

function UserProfileBottomSheet(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { userInfo },
    },
  } = props;

  const { goBackOnce } = navigation;

  const bottomSheetRef = React.useRef();

  React.useEffect(() => {
    if (!bottomSheetRef.current) {
      return;
    }

    bottomSheetRef.current.present();
  }, []);

  const onClosed = React.useCallback(() => {
    goBackOnce();
  }, [goBackOnce]);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={onClosed}>
      <UserProfile userInfo={userInfo} />
    </BottomSheet>
  );
}

export default UserProfileBottomSheet;
