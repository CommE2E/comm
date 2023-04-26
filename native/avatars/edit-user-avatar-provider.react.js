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
  ENSAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
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

  const userAvatarSaveInProgress =
    userAvatarMediaUploadInProgress ||
    updateUserAvatarLoadingStatus === 'loading';

  const updateImageUserAvatarPromise = React.useCallback(
    async (imageAvatarUpdateRequest: ImageAvatarDBContent) => {
      setUserAvatarMediaUploadInProgress(false);
      try {
        return await updateUserAvatarCall(imageAvatarUpdateRequest);
      } catch (e) {
        Alert.alert('Avatar update failed', 'Unable to update avatar.');
        throw e;
      }
    },
    [updateUserAvatarCall],
  );

  const uploadUserAvatarSelectedMedia = useUploadSelectedMedia(
    setUserAvatarMediaUploadInProgress,
  );
  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();
    const imageAvatarUpdateRequest = await uploadUserAvatarSelectedMedia(
      selection,
    );

    if (!imageAvatarUpdateRequest) {
      return;
    }

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      updateImageUserAvatarPromise(imageAvatarUpdateRequest),
    );
  }, [
    dispatchActionPromise,
    updateImageUserAvatarPromise,
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
