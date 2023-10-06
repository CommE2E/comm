// @flow

import * as React from 'react';

import type { Dimensions } from 'lib/types/media-types.js';

import type { UserProfileBottomSheetNavigationProp } from './user-profile-bottom-sheet-navigator.react.js';
import { xxLargeAvatarSize } from '../avatars/avatar-constants.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import FullScreenViewModal from '../components/full-screen-view-modal.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  type VerticalBounds,
  type LayoutCoordinates,
} from '../types/layout-types.js';

const avatarDimensions: Dimensions = {
  width: xxLargeAvatarSize,
  height: xxLargeAvatarSize,
};

export type UserProfileAvatarModalParams = {
  +presentedFrom: string,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +userID: ?string,
};

type Props = {
  +navigation: UserProfileBottomSheetNavigationProp<'UserProfileAvatarModal'>,
  +route: NavigationRoute<'UserProfileAvatarModal'>,
};

function UserProfileAvatarModal(props: Props): React.Node {
  const { navigation, route } = props;

  const { userID } = route.params;

  return (
    <FullScreenViewModal
      navigation={navigation}
      route={route}
      contentDimensions={avatarDimensions}
    >
      <UserAvatar size="XXL" userID={userID} />
    </FullScreenViewModal>
  );
}

export default UserProfileAvatarModal;
