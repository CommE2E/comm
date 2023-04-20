// @flow

import * as React from 'react';

import type { PhotoCapture } from 'lib/types/media-types.js';

import { useSelectFromCameraAndUpdateThreadAvatar } from '../avatars/avatar-hooks.js';
import CameraModal from '../media/camera-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type ThreadAvatarCameraModalParams = {
  +threadID: string,
};

type Props = {
  +navigation: AppNavigationProp<'ThreadAvatarCameraModal'>,
  +route: NavigationRoute<'ThreadAvatarCameraModal'>,
};

function ThreadAvatarCameraModal(props: Props): React.Node {
  const { navigation, route } = props;
  const { threadID } = route.params;

  const { updateThreadAvatar } =
    useSelectFromCameraAndUpdateThreadAvatar(threadID);

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      updateThreadAvatar(capture);
    },
    [updateThreadAvatar],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} navigation={navigation} />;
}

export default ThreadAvatarCameraModal;
