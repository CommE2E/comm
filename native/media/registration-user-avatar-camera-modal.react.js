// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';

import type { RegistrationNavigationProp } from '../account/registration/registration-navigator.react.js';
import CameraModal from '../media/camera-modal.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RegistrationNavigationProp<'RegistrationUserAvatarCameraModal'>,
  +route: NavigationRoute<'RegistrationUserAvatarCameraModal'>,
};

function RegistrationUserAvatarCameraModal(props: Props): React.Node {
  const { navigation } = props;

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { updateImageUserAvatar } = editUserAvatarContext;

  return (
    <CameraModal
      handlePhotoCapture={updateImageUserAvatar}
      navigation={navigation}
    />
  );
}

export default RegistrationUserAvatarCameraModal;
