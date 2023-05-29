// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { NativeMediaSelection } from 'lib/types/media-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
import { useSelector } from '../redux/redux-utils.js';

export type EditUserAvatarContextType = {
  +userAvatarSaveInProgress: boolean,
  +selectFromGalleryAndUpdateUserAvatar: () => Promise<void>,
  +updateImageUserAvatar: (selection: NativeMediaSelection) => Promise<void>,
  +setUserAvatar: (
    avatarRequest: UpdateUserAvatarRequest,
  ) => Promise<UpdateUserAvatarResponse>,
};

const EditUserAvatarContext: React.Context<?EditUserAvatarContextType> =
  React.createContext<?EditUserAvatarContextType>();

const updateUserAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

const failureAlert = () =>
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
      const imageAvatarUpdateRequest = await uploadSelectedMedia(selection);

      if (!imageAvatarUpdateRequest) {
        return;
      }

      dispatchActionPromise(
        updateUserAvatarActionTypes,
        (async () => {
          setUserAvatarMediaUploadInProgress(false);
          try {
            return await updateUserAvatarCall(imageAvatarUpdateRequest);
          } catch (e) {
            failureAlert();
            throw e;
          }
        })(),
      );
    },
    [dispatchActionPromise, updateUserAvatarCall, uploadSelectedMedia],
  );

  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection = await selectFromGallery();
    if (!selection) {
      return;
    }
    await updateImageUserAvatar(selection);
  }, [updateImageUserAvatar]);

  const setUserAvatar = React.useCallback(
    (avatarRequest: UpdateUserAvatarRequest) => {
      const promise = (async () => {
        try {
          return await updateUserAvatarCall(avatarRequest);
        } catch (e) {
          failureAlert();
          throw e;
        }
      })();
      dispatchActionPromise(updateUserAvatarActionTypes, promise);
      return promise;
    },
    [dispatchActionPromise, updateUserAvatarCall],
  );

  const context = React.useMemo(
    () => ({
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setUserAvatar,
    }),
    [
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setUserAvatar,
    ],
  );

  return (
    <EditUserAvatarContext.Provider value={context}>
      {children}
    </EditUserAvatarContext.Provider>
  );
}

export { EditUserAvatarContext, EditUserAvatarProvider };
