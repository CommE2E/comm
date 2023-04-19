// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { PhotoCapture } from 'lib/types/media-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import CameraModal from './camera-modal.react.js';
import { InputStateContext } from '../input/input-state.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type ChatCameraModalParams = {
  +presentedFrom: string,
  +thread: ThreadInfo,
};

type Props = {
  +navigation: AppNavigationProp<'ChatCameraModal'>,
  +route: NavigationRoute<'ChatCameraModal'>,
};

function ChatCameraModal(props: Props): React.Node {
  const { thread } = props.route.params;

  const inputState = React.useContext(InputStateContext);

  const sendPhoto = React.useCallback(
    (capture: PhotoCapture) => {
      invariant(inputState, 'inputState should be set');
      inputState.sendMultimediaMessage([capture], thread);
    },
    [inputState, thread],
  );

  return <CameraModal handlePhotoCapture={sendPhoto} />;
}

export default ChatCameraModal;
