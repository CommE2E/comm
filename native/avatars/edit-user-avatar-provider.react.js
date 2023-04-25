// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  ImageAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
  ENSAvatarDBContent,
} from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MediaLibrarySelection } from 'lib/types/media-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
import { useSelector } from '../redux/redux-utils.js';

export type EditUserAvatarContextType = {
  +userAvatarSaveInProgress: boolean,
  +selectFromGalleryAndUpdateUserAvatar: () => Promise<void>,
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

  const userAvatarSaveInProgress = React.useMemo(
    () =>
      userAvatarMediaUploadInProgress ||
      updateUserAvatarLoadingStatus === 'loading',
    [userAvatarMediaUploadInProgress, updateUserAvatarLoadingStatus],
  );

  const uploadUserAvatarSelectedMedia = useUploadSelectedMedia(
    setUserAvatarMediaUploadInProgress,
  );
  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();
    const uploadedMediaID = await uploadUserAvatarSelectedMedia(selection);

    if (!uploadedMediaID) {
      return;
    }

    const imageAvatarUpdateRequest: ImageAvatarDBContent = {
      type: 'image',
      uploadID: uploadedMediaID,
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      (async () => {
        setUserAvatarMediaUploadInProgress(false);
        try {
          return await updateUserAvatarCall(imageAvatarUpdateRequest);
        } catch {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
        }
      })(),
    );
  }, [
    dispatchActionPromise,
    updateUserAvatarCall,
    uploadUserAvatarSelectedMedia,
  ]);

  const setENSUserAvatar = React.useCallback(() => {
    const ensAvatarRequest: ENSAvatarDBContent = {
      type: 'ens',
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      (async () => {
        try {
          return await updateUserAvatarCall(ensAvatarRequest);
        } catch {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
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
        } catch {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
        }
      })(),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  const context = React.useMemo(
    () => ({
      userAvatarSaveInProgress,
      selectFromGalleryAndUpdateUserAvatar,
      setENSUserAvatar,
      removeUserAvatar,
    }),
    [
      removeUserAvatar,
      selectFromGalleryAndUpdateUserAvatar,
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
