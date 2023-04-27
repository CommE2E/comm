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
import type { UpdateThreadRequest } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { activeThreadSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

export type EditThreadAvatarContextType = {
  +threadAvatarSaveInProgress: boolean,
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

  const threadAvatarSaveInProgress =
    updateThreadAvatarLoadingStatus === 'loading';

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
      removeThreadAvatar,
    }),
    [removeThreadAvatar, threadAvatarSaveInProgress],
  );

  return (
    <EditThreadAvatarContext.Provider value={context}>
      {children}
    </EditThreadAvatarContext.Provider>
  );
}

export { EditThreadAvatarContext, EditThreadAvatarProvider };
