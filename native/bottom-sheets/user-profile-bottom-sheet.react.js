// @flow

import * as React from 'react';

import type { UserInfo } from 'lib/types/user-types';

import BottomSheet from './bottom-sheet.react.js';
import UserProfile from '../components/user-profile.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

export type UserProfileBottomSheetParams = {
  +userID: string,
};

type Props = {
  +navigation: RootNavigationProp<'UserProfileBottomSheet'>,
  +route: NavigationRoute<'UserProfileBottomSheet'>,
};

function UserProfileBottomSheet(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { userID },
    },
  } = props;

  const { goBackOnce } = navigation;

  const userInfo: ?UserInfo = useSelector(
    state => state.userStore.userInfos[userID],
  );

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
