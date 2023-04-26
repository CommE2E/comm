// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { PhotoCapture } from 'lib/types/media-types.js';

import { EditThreadAvatarContext } from '../avatars/edit-thread-avatar-provider.react.js';
import CameraModal from '../media/camera-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: AppNavigationProp<'ThreadAvatarCameraModal'>,
  +route: NavigationRoute<'ThreadAvatarCameraModal'>,
};

function ThreadAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');
  const { updateImageThreadAvatar } = editThreadAvatarContext;

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      updateImageThreadAvatar(capture);
    },
    [updateImageThreadAvatar],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} navigation={navigation} />;
}

export default ThreadAvatarCameraModal;
