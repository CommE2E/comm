// @flow

import * as React from 'react';

import type { PhotoCapture } from 'lib/types/media-types.js';

import { useSelectFromCameraAndUpdateUserAvatar } from '../avatars/avatar-hooks.js';
import CameraModal from '../media/camera-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: AppNavigationProp<'UserAvatarCameraModal'>,
  +route: NavigationRoute<'UserAvatarCameraModal'>,
};

function UserAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const { updateUserAvatar } = useSelectFromCameraAndUpdateUserAvatar();

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      updateUserAvatar(capture);
    },
    [updateUserAvatar],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} navigation={navigation} />;
}

export default UserAvatarCameraModal;
