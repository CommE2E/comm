// @flow

import * as React from 'react';

import type { UserInfo } from 'lib/types/user-types';

import type { UserProfileBottomSheetNavigationProp } from './user-profile-bottom-sheet-navigator.react.js';
import UserProfile from './user-profile.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

export type UserProfileBottomSheetParams = {
  +userID: string,
};

type Props = {
  +navigation: UserProfileBottomSheetNavigationProp<'UserProfileBottomSheet'>,
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

  return (
    <BottomSheet onClosed={goBack}>
      <UserProfile userInfo={userInfo} />
    </BottomSheet>
  );
}

export default UserProfileBottomSheet;
