// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { UpdateUserAvatarRemoveRequest } from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MediaLibrarySelection } from 'lib/types/media-types.js';
import type { UpdateThreadRequest } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
import { activeThreadSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

export type EditThreadAvatarContextType = {
  +threadAvatarSaveInProgress: boolean,
  +selectFromGalleryAndUpdateThreadAvatar: () => Promise<void>,
  +removeThreadAvatar: () => void,
};

const EditThreadAvatarContext: React.Context<?EditThreadAvatarContextType> =
  React.createContext<?EditThreadAvatarContextType>();

type Props = {
  +children: React.Node,
};
function EditThreadAvatarProvider(props: Props): React.Node {
  const { children } = props;

  const navContext = React.useContext(NavContext);
  const activeThreadID = React.useMemo(
    () => activeThreadSelector(navContext) ?? '',
    [navContext],
  );

  const updateThreadAvatarLoadingStatus: LoadingStatus = useSelector(
    createLoadingStatusSelector(
      changeThreadSettingsActionTypes,
      `${changeThreadSettingsActionTypes.started}:${activeThreadID}:avatar`,
    ),
  );

  const [
    threadAvatarMediaUploadInProgress,
    setThreadAvatarMediaUploadInProgress,
  ] = React.useState<$ReadOnlySet<string>>(new Set<string>());

  const threadAvatarSaveInProgress =
    threadAvatarMediaUploadInProgress.has(activeThreadID) ||
    updateThreadAvatarLoadingStatus === 'loading';

  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const updateThreadAvatarMediaUploadInProgress = React.useCallback(
    (inProgress: boolean) =>
      setThreadAvatarMediaUploadInProgress(prevState => {
        const updatedSet = new Set(prevState);
        if (inProgress) {
          updatedSet.add(activeThreadID);
        } else {
          updatedSet.delete(activeThreadID);
        }
        return updatedSet;
      }),
    [activeThreadID],
  );

  const uploadThreadAvatarSelectedMedia = useUploadSelectedMedia(
    updateThreadAvatarMediaUploadInProgress,
  );

  const updateImageThreadAvatar = React.useCallback(
    async (selection: ?MediaLibrarySelection) => {
      const imageAvatarUpdateRequest = await uploadThreadAvatarSelectedMedia(
        selection,
      );

      if (!imageAvatarUpdateRequest) {
        return;
      }

      const updateThreadRequest: UpdateThreadRequest = {
        threadID: activeThreadID,
        changes: {
          avatar: imageAvatarUpdateRequest,
        },
      };

      const action = changeThreadSettingsActionTypes.started;
      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        (async () => {
          updateThreadAvatarMediaUploadInProgress(false);
          try {
            return await changeThreadSettingsCall(updateThreadRequest);
          } catch (e) {
            Alert.alert('Avatar update failed', 'Unable to update avatar.');
            throw e;
          }
        })(),
        {
          customKeyName: `${action}:${activeThreadID}:avatar`,
        },
      );
    },
    [
      activeThreadID,
      changeThreadSettingsCall,
      dispatchActionPromise,
      updateThreadAvatarMediaUploadInProgress,
      uploadThreadAvatarSelectedMedia,
    ],
  );

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();
    await updateImageThreadAvatar(selection);
  }, [updateImageThreadAvatar]);

  const removeThreadAvatar = React.useCallback(() => {
    const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
      type: 'remove',
    };

    const updateThreadRequest: UpdateThreadRequest = {
      threadID: activeThreadID,
      changes: {
        avatar: removeAvatarRequest,
      },
    };

    const action = changeThreadSettingsActionTypes.started;
    dispatchActionPromise(
      changeThreadSettingsActionTypes,
      (async () => {
        try {
          return await changeThreadSettingsCall(updateThreadRequest);
        } catch (e) {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
          throw e;
        }
      })(),
      { customKeyName: `${action}:${activeThreadID}:avatar` },
    );
  }, [activeThreadID, changeThreadSettingsCall, dispatchActionPromise]);

  const context = React.useMemo(
    () => ({
      threadAvatarSaveInProgress,
      selectFromGalleryAndUpdateThreadAvatar,
      removeThreadAvatar,
    }),
    [
      removeThreadAvatar,
      selectFromGalleryAndUpdateThreadAvatar,
      threadAvatarSaveInProgress,
    ],
  );

  return (
    <EditThreadAvatarContext.Provider value={context}>
      {children}
    </EditThreadAvatarContext.Provider>
  );
}

export { EditThreadAvatarContext, EditThreadAvatarProvider };
