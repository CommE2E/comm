// @flow

import * as React from 'react';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from '../actions/thread-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type {
  UpdateUserAvatarRequest,
  ImageAvatarDBContent,
} from '../types/avatar-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type {
  MediaLibrarySelection,
  NativeMediaSelection,
} from '../types/media-types.js';
import type { UpdateThreadRequest } from '../types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

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

type Props = {
  +displayFailureAlert: () => mixed,
  +selectFromGallery: () => Promise<?MediaLibrarySelection>,
  +useUploadSelectedMedia: (
    setProcessingOrUploadInProgress?: (inProgress: boolean) => mixed,
  ) => (selection: NativeMediaSelection) => Promise<?ImageAvatarDBContent>,
  +activeThreadID: string,
  +children: React.Node,
};
function BaseEditThreadAvatarProvider(props: Props): React.Node {
  const {
    displayFailureAlert,
    selectFromGallery,
    useUploadSelectedMedia,
    activeThreadID,
    children,
  } = props;

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
      displayFailureAlert,
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
    [selectFromGallery, updateImageThreadAvatar],
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
    [changeThreadSettingsCall, dispatchActionPromise, displayFailureAlert],
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

export { EditThreadAvatarContext, BaseEditThreadAvatarProvider };
