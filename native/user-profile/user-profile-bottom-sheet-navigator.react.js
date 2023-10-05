// @flow

import * as React from 'react';

import UserProfileBottomSheet from './user-profile-bottom-sheet.react.js';
import { createOverlayNavigator } from '../navigation/overlay-navigator.react.js';
import type {
  OverlayNavigationProp,
  OverlayNavigationHelpers,
} from '../navigation/overlay-navigator.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  UserProfileBottomSheetRouteName,
  type ScreenParamList,
  type UserProfileBottomSheetParamList,
} from '../navigation/route-names.js';

export type UserProfileBottomSheetNavigationProp<
  RouteName: $Keys<UserProfileBottomSheetParamList>,
> = OverlayNavigationProp<ScreenParamList, RouteName>;

const UserProfileBottomSheetOverlayNavigator = createOverlayNavigator<
  ScreenParamList,
  UserProfileBottomSheetParamList,
  OverlayNavigationHelpers<ScreenParamList>,
>();

type Props = {
  +navigation: RootNavigationProp<'UserProfileBottomSheet'>,
  ...
};

// eslint-disable-next-line no-unused-vars
function UserProfileBottomSheetNavigator(props: Props): React.Node {
  return (
    <UserProfileBottomSheetOverlayNavigator.Navigator>
      <UserProfileBottomSheetOverlayNavigator.Screen
        name={UserProfileBottomSheetRouteName}
        component={UserProfileBottomSheet}
      />
    </UserProfileBottomSheetOverlayNavigator.Navigator>
  );
}

export default UserProfileBottomSheetNavigator;
