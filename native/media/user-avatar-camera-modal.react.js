// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { PhotoCapture } from 'lib/types/media-types.js';

import { EditUserAvatarContext } from '../avatars/edit-user-avatar-provider.react.js';
import CameraModal from '../media/camera-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: AppNavigationProp<'UserAvatarCameraModal'>,
  +route: NavigationRoute<'UserAvatarCameraModal'>,
};

function UserAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { updateImageUserAvatar } = editUserAvatarContext;

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      updateImageUserAvatar(capture);
    },
    [updateImageUserAvatar],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} navigation={navigation} />;
}

export default UserAvatarCameraModal;
