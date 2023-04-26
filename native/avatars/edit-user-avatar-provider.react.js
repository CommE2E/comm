// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  ENSAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
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
  +setENSUserAvatar: () => void,
  +removeUserAvatar: () => void,
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

  const updateUserAvatarMediaUploadInProgress = React.useCallback(
    (inProgress: boolean) => setUserAvatarMediaUploadInProgress(inProgress),
    [],
  );

  const uploadUserAvatarSelectedMedia = useUploadSelectedMedia(
    updateUserAvatarMediaUploadInProgress,
  );

  const updateImageUserAvatar = React.useCallback(
    async (selection: ?NativeMediaSelection) => {
      const imageAvatarUpdateRequest = await uploadUserAvatarSelectedMedia(
        selection,
      );

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
            Alert.alert('Avatar update failed', 'Unable to update avatar.');
            throw e;
          }
        })(),
      );
    },
    [
      dispatchActionPromise,
      updateUserAvatarCall,
      uploadUserAvatarSelectedMedia,
    ],
  );

  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection = await selectFromGallery();
    await updateImageUserAvatar(selection);
  }, [updateImageUserAvatar]);

  const setENSUserAvatar = React.useCallback(() => {
    const ensAvatarRequest: ENSAvatarDBContent = {
      type: 'ens',
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      (async () => {
        try {
          return await updateUserAvatarCall(ensAvatarRequest);
        } catch (e) {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
          throw e;
        }
      })(),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  const removeUserAvatar = React.useCallback(() => {
    const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
      type: 'remove',
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      (async () => {
        try {
          return await updateUserAvatarCall(removeAvatarRequest);
        } catch (e) {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
          throw e;
        }
      })(),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  const context = React.useMemo(
    () => ({
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setENSUserAvatar,
      removeUserAvatar,
    }),
    [
      removeUserAvatar,
      selectFromGalleryAndUpdateUserAvatar,
      updateImageUserAvatar,
      setENSUserAvatar,
      userAvatarSaveInProgress,
    ],
  );

  return (
    <EditUserAvatarContext.Provider value={context}>
      {children}
    </EditUserAvatarContext.Provider>
  );
}

export { EditUserAvatarContext, EditUserAvatarProvider };
