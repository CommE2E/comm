// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type {
  MediaLibrarySelection,
  NativeMediaSelection,
} from 'lib/types/media-types.js';
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
  +selectFromGalleryAndUpdateThreadAvatar: (threadID: string) => Promise<void>,
  +updateImageThreadAvatar: (
    selection: NativeMediaSelection,
    threadID: string,
  ) => Promise<void>,
  +setThreadAvatar: (
    threadID: string,
    avatarRequest: UpdateUserAvatarRequest,
  ) => Promise<void>,
};

const EditThreadAvatarContext: React.Context<?EditThreadAvatarContextType> =
  React.createContext<?EditThreadAvatarContextType>();

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

  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const [
    threadAvatarMediaUploadInProgress,
    setThreadAvatarMediaUploadInProgress,
  ] = React.useState<$ReadOnlySet<string>>(new Set<string>());

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

  const threadAvatarSaveInProgress =
    threadAvatarMediaUploadInProgress.has(activeThreadID) ||
    updateThreadAvatarLoadingStatus === 'loading';

  const uploadSelectedMedia = useUploadSelectedMedia(
    updateThreadAvatarMediaUploadInProgress,
  );

  const updateImageThreadAvatar = React.useCallback(
    async (selection: NativeMediaSelection, threadID: string) => {
      const imageAvatarUpdateRequest = await uploadSelectedMedia(selection);

      if (!imageAvatarUpdateRequest) {
        return;
      }

      const updateThreadRequest: UpdateThreadRequest = {
        threadID,
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
            displayFailureAlert();
            throw e;
          }
        })(),
        {
          customKeyName: `${action}:${threadID}:avatar`,
        },
      );
    },
    [
      changeThreadSettingsCall,
      dispatchActionPromise,
      updateThreadAvatarMediaUploadInProgress,
      uploadSelectedMedia,
    ],
  );

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(
    async (threadID: string) => {
      const selection: ?MediaLibrarySelection = await selectFromGallery();
      if (!selection) {
        return;
      }
      await updateImageThreadAvatar(selection, threadID);
    },
    [updateImageThreadAvatar],
  );

  const setThreadAvatar = React.useCallback(
    async (threadID: string, avatarRequest: UpdateUserAvatarRequest) => {
      const updateThreadRequest: UpdateThreadRequest = {
        threadID,
        changes: {
          avatar: avatarRequest,
        },
      };
      const action = changeThreadSettingsActionTypes.started;
      const promise = (async () => {
        try {
          return await changeThreadSettingsCall(updateThreadRequest);
        } catch (e) {
          displayFailureAlert();
          throw e;
        }
      })();
      dispatchActionPromise(changeThreadSettingsActionTypes, promise, {
        customKeyName: `${action}:${threadID}:avatar`,
      });
      await promise;
    },
    [changeThreadSettingsCall, dispatchActionPromise],
  );

  const context = React.useMemo(
    () => ({
      threadAvatarSaveInProgress,
      selectFromGalleryAndUpdateThreadAvatar,
      updateImageThreadAvatar,
      setThreadAvatar,
    }),
    [
      threadAvatarSaveInProgress,
      selectFromGalleryAndUpdateThreadAvatar,
      updateImageThreadAvatar,
      setThreadAvatar,
    ],
  );

  return (
    <EditThreadAvatarContext.Provider value={context}>
      {children}
    </EditThreadAvatarContext.Provider>
  );
}

export { EditThreadAvatarContext, EditThreadAvatarProvider };
