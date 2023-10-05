// @flow

import * as React from 'react';

import type { UserInfo } from 'lib/types/user-types';

import UserProfile from './user-profile.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
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

  const { goBack } = navigation;

  const userInfo: ?UserInfo = useSelector(
    state => state.userStore.userInfos[userID],
  );

  const bottomSheetRef = React.useRef();

  const onClosed = React.useCallback(() => {
    goBack();
  }, [goBack]);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={onClosed}>
      <UserProfile userInfo={userInfo} />
    </BottomSheet>
  );
}

export default UserProfileBottomSheet;
