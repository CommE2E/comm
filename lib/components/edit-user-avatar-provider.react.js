// @flow

import * as React from 'react';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from '../actions/user-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type {
  ImageAvatarDBContent,
  UpdateUserAvatarRequest,
} from '../types/avatar-types.js';
import type { SetState } from '../types/hook-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { NativeMediaSelection } from '../types/media-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

export type UserAvatarSelection =
  | { +needsUpload: true, +mediaSelection: NativeMediaSelection }
  | { +needsUpload: false, +updateUserAvatarRequest: UpdateUserAvatarRequest };
type RegistrationMode =
  | { +registrationMode: 'off' }
  | {
      +registrationMode: 'on',
      +successCallback: UserAvatarSelection => mixed,
    };
const registrationModeOff = { registrationMode: 'off' };

export type EditUserAvatarContextType = {
  +setUserAvatarMediaUploadInProgress: SetState<boolean>,
  +userAvatarSaveInProgress: boolean,
  +updateImageUserAvatar: (
    imageAvatarUpdateRequest: ImageAvatarDBContent,
  ) => Promise<void>,
  +baseSetUserAvatar: (avatarRequest: UpdateUserAvatarRequest) => Promise<void>,
  +setRegistrationMode: (registrationMode: RegistrationMode) => void,
  +getRegistrationModeEnabled: () => boolean,
  +getRegistrationModeSuccessCallback: () => ?(UserAvatarSelection) => mixed,
};

const EditUserAvatarContext: React.Context<?EditUserAvatarContextType> =
  React.createContext<?EditUserAvatarContextType>();

const updateUserAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

type Props = {
  +children: React.Node,
};
function EditUserAvatarProvider(props: Props): React.Node {
  const { children } = props;

  const registrationModeRef =
    React.useRef<RegistrationMode>(registrationModeOff);

  const dispatchActionPromise = useDispatchActionPromise();
  const updateUserAvatarCall = useServerCall(updateUserAvatar);

  const [userAvatarMediaUploadInProgress, setUserAvatarMediaUploadInProgress] =
    React.useState(false);

  const updateUserAvatarLoadingStatus: LoadingStatus = useSelector(
    updateUserAvatarLoadingStatusSelector,
  );

  const userAvatarSaveInProgress =
    userAvatarMediaUploadInProgress ||
    updateUserAvatarLoadingStatus === 'loading';

  const updateImageUserAvatar = React.useCallback(
    async (imageAvatarUpdateRequest: ImageAvatarDBContent) => {
      const promise = (async () => {
        setUserAvatarMediaUploadInProgress(false);
        return await updateUserAvatarCall(imageAvatarUpdateRequest);
      })();
      dispatchActionPromise(updateUserAvatarActionTypes, promise);
      await promise;
    },
    [dispatchActionPromise, updateUserAvatarCall],
  );

  // NOTE: Do NOT consume `baseSetUserAvatar` directly.
  //       Use platform-specific `[web/native]SetUserAvatar` instead.
  const baseSetUserAvatar = React.useCallback(
    async (request: UpdateUserAvatarRequest) => {
      const promise = updateUserAvatarCall(request);
      dispatchActionPromise(updateUserAvatarActionTypes, promise);
      await promise;
    },
    [dispatchActionPromise, updateUserAvatarCall],
  );

  const setRegistrationMode = React.useCallback((mode: RegistrationMode) => {
    registrationModeRef.current = mode;
  }, []);
  const getRegistrationModeEnabled = React.useCallback(
    () => registrationModeRef.current.registrationMode === 'on',
    [],
  );
  const getRegistrationModeSuccessCallback = React.useCallback(
    () =>
      registrationModeRef.current.registrationMode === 'on'
        ? registrationModeRef.current.successCallback
        : null,
    [],
  );

  const context = React.useMemo(
    () => ({
      setUserAvatarMediaUploadInProgress,
      userAvatarSaveInProgress,
      updateImageUserAvatar,
      baseSetUserAvatar,
      setRegistrationMode,
      getRegistrationModeEnabled,
      getRegistrationModeSuccessCallback,
    }),
    [
      setUserAvatarMediaUploadInProgress,
      userAvatarSaveInProgress,
      updateImageUserAvatar,
      baseSetUserAvatar,
      setRegistrationMode,
      getRegistrationModeEnabled,
      getRegistrationModeSuccessCallback,
    ],
  );

  return (
    <EditUserAvatarContext.Provider value={context}>
      {children}
    </EditUserAvatarContext.Provider>
  );
}

export { EditUserAvatarContext, EditUserAvatarProvider };
