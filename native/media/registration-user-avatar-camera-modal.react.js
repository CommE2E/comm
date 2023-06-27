// @flow

import * as React from 'react';

import type { RegistrationNavigationProp } from '../account/registration/registration-navigator.react.js';
import { useNativeUpdateUserImageAvatar } from '../avatars/avatar-hooks.js';
import CameraModal from '../media/camera-modal.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RegistrationNavigationProp<'RegistrationUserAvatarCameraModal'>,
  +route: NavigationRoute<'RegistrationUserAvatarCameraModal'>,
};

function RegistrationUserAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const nativeUpdateUserImageAvatar = useNativeUpdateUserImageAvatar();

  return (
    <CameraModal
      handlePhotoCapture={nativeUpdateUserImageAvatar}
      navigation={navigation}
    />
  );
}

export default RegistrationUserAvatarCameraModal;
