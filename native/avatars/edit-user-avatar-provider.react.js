// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { NativeMediaSelection } from 'lib/types/media-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
import { useSelector } from '../redux/redux-utils.js';

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
  +userAvatarSaveInProgress: boolean,
  +selectFromGalleryAndUpdateUserAvatar: () => Promise<void>,
  +updateImageUserAvatar: (selection: NativeMediaSelection) => Promise<void>,
  +setUserAvatar: (avatarRequest: UpdateUserAvatarRequest) => Promise<void>,
  +setRegistrationMode: (registrationMode: RegistrationMode) => void,
};

const EditUserAvatarContext: React.Context<?EditUserAvatarContextType> =
  React.createContext<?EditUserAvatarContextType>();

const updateUserAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

const displayFailureAlert = () =>
  Alert.alert(
    'Couldn’t save avatar',
    'Please try again later',
    [{ text: 'OK' }],
    { cancelable: true },
  );

type Props = {
  +children: React.Node,
};
function EditUserAvatarProvider(props: Props): React.Node {
  const { children } = props;

  const [registrationMode, setRegistrationMode] =
    React.useState<RegistrationMode>(registrationModeOff);

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

  const uploadSelectedMedia = useUploadSelectedMedia(
    setUserAvatarMediaUploadInProgress,
  );

  const updateImageUserAvatar = React.useCallback(
    async (selection: NativeMediaSelection) => {
      if (registrationMode.registrationMode === 'on') {
        registrationMode.successCallback({
          needsUpload: true,
          mediaSelection: selection,
        });
        return;
      }

      const imageAvatarUpdateRequest = await uploadSelectedMedia(selection);
      if (!imageAvatarUpdateRequest) {
        return;
      }

      const promise = (async () => {
        setUserAvatarMediaUploadInProgress(false);
        try {
          return await updateUserAvatarCall(imageAvatarUpdateRequest);
        } catch (e) {
          displayFailureAlert();
          throw e;
        }
      })();
      dispatchActionPromise(updateUserAvatarActionTypes, promise);
      await promise;
    },
    [
      registrationMode,
      uploadSelectedMedia,
      updateUserAvatarCall,
      dispatchActionPromise,
    ],
  );

  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection = await selectFromGallery();
    if (!selection) {
      return;
    }
    await updateImageUserAvatar(selection);
  }, [updateImageUserAvatar]);

  const setUserAvatar = React.useCallback(
    async (request: UpdateUserAvatarRequest) => {
      if (registrationMode.registrationMode === 'on') {
        registrationMode.successCallback({
          needsUpload: false,
          updateUserAvatarRequest: request,
        });
        return;
      }

      const promise = (async () => {
        try {
          return await updateUserAvatarCall(request);
        } catch (e) {
          displayFailureAlert();
          throw e;
        }
      })();
      dispatchActionPromise(updateUserAvatarActionTypes, promise);
      await promise;
    },
    [registrationMode, updateUserAvatarCall, dispatchActionPromise],
  );

  const context = React.useMemo(
    () => ({
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setUserAvatar,
      setRegistrationMode,
    }),
    [
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setUserAvatar,
      setRegistrationMode,
    ],
  );

  return (
    <EditUserAvatarContext.Provider value={context}>
      {children}
    </EditUserAvatarContext.Provider>
  );
}

export { EditUserAvatarContext, EditUserAvatarProvider };
