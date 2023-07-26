// @flow

import * as React from 'react';

import { useNativeUpdateUserImageAvatar } from '../avatars/avatar-hooks.js';
import CameraModal from '../media/camera-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: AppNavigationProp<'UserAvatarCameraModal'>,
  +route: NavigationRoute<'UserAvatarCameraModal'>,
};

function UserAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const nativeUpdateUserImageAvatar = useNativeUpdateUserImageAvatar();

  return (
    <CameraModal
      handlePhotoCapture={nativeUpdateUserImageAvatar}
      navigation={navigation}
    />
  );
}

export default UserAvatarCameraModal;
