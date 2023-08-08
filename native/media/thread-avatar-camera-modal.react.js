// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import type { PhotoCapture } from 'lib/types/media-types.js';

import { useNativeUpdateThreadImageAvatar } from '../avatars/avatar-hooks.js';
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

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const nativeUpdateThreadImageAvatar = useNativeUpdateThreadImageAvatar();

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      nativeUpdateThreadImageAvatar(capture, threadID);
    },
    [threadID, nativeUpdateThreadImageAvatar],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} navigation={navigation} />;
}

export default ThreadAvatarCameraModal;
