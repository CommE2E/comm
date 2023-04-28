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
  +selectFromGalleryAndUpdateThreadAvatar: (threadID: string) => Promise<void>,
  +removeThreadAvatar: (threadID: string) => void,
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

  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const [processingOrUploadInProgress, setProcessingOrUploadInProgress] =
    React.useState(false);

  const threadAvatarSaveInProgress =
    processingOrUploadInProgress ||
    updateThreadAvatarLoadingStatus === 'loading';

  const uploadSelectedMedia = useUploadSelectedMedia(
    setProcessingOrUploadInProgress,
  );

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(
    async (threadID: string) => {
      const selection: ?MediaLibrarySelection = await selectFromGallery();
      if (!selection) {
        return;
      }

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
          setProcessingOrUploadInProgress(false);
          try {
            return await changeThreadSettingsCall(updateThreadRequest);
          } catch (e) {
            Alert.alert('Avatar update failed', 'Unable to update avatar.');
            throw e;
          }
        })(),
        {
          customKeyName: `${action}:${threadID}:avatar`,
        },
      );
    },
    [changeThreadSettingsCall, dispatchActionPromise, uploadSelectedMedia],
  );

  const removeThreadAvatar = React.useCallback(
    (threadID: string) => {
      const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
        type: 'remove',
      };

      const updateThreadRequest: UpdateThreadRequest = {
        threadID,
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
        { customKeyName: `${action}:${threadID}:avatar` },
      );
    },
    [changeThreadSettingsCall, dispatchActionPromise],
  );

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
