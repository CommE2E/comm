// @flow

import * as React from 'react';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from '../actions/thread-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { UpdateUserAvatarRequest } from '../types/avatar-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { UpdateThreadRequest } from '../types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

export type EditThreadAvatarContextType = {
  +updateThreadAvatarMediaUploadInProgress: (inProgress: boolean) => void,
  +threadAvatarSaveInProgress: boolean,
  +baseSetThreadAvatar: (
    threadID: string,
    avatarRequest: UpdateUserAvatarRequest,
  ) => Promise<void>,
};

const EditThreadAvatarContext: React.Context<?EditThreadAvatarContextType> =
  React.createContext<?EditThreadAvatarContextType>();

type Props = {
  +activeThreadID: string,
  +children: React.Node,
};
function BaseEditThreadAvatarProvider(props: Props): React.Node {
  const { activeThreadID, children } = props;

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

  // NOTE: Do NOT consume `baseSetThreadAvatar` directly.
  //       Use platform-specific `[web/native]SetThreadAvatar` instead.
  const baseSetThreadAvatar = React.useCallback(
    async (threadID: string, avatarRequest: UpdateUserAvatarRequest) => {
      const updateThreadRequest: UpdateThreadRequest = {
        threadID,
        changes: {
          avatar: avatarRequest,
        },
      };
      const action = changeThreadSettingsActionTypes.started;
      if (avatarRequest.type === 'image') {
        updateThreadAvatarMediaUploadInProgress(false);
      }
      const promise = changeThreadSettingsCall(updateThreadRequest);
      dispatchActionPromise(changeThreadSettingsActionTypes, promise, {
        customKeyName: `${action}:${threadID}:avatar`,
      });
      await promise;
    },
    [
      changeThreadSettingsCall,
      dispatchActionPromise,
      updateThreadAvatarMediaUploadInProgress,
    ],
  );

  const context = React.useMemo(
    () => ({
      updateThreadAvatarMediaUploadInProgress,
      threadAvatarSaveInProgress,
      baseSetThreadAvatar,
    }),
    [
      updateThreadAvatarMediaUploadInProgress,
      threadAvatarSaveInProgress,
      baseSetThreadAvatar,
    ],
  );

  return (
    <EditThreadAvatarContext.Provider value={context}>
      {children}
    </EditThreadAvatarContext.Provider>
  );
}

export { EditThreadAvatarContext, BaseEditThreadAvatarProvider };
