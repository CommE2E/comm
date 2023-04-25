// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { UpdateUserAvatarRemoveRequest } from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { useSelector } from '../redux/redux-utils.js';

export type EditUserAvatarContextType = {
  +userAvatarSaveInProgress: boolean,
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

  const updateUserAvatarLoadingStatus: LoadingStatus = useSelector(
    updateUserAvatarLoadingStatusSelector,
  );

  const userAvatarSaveInProgress = updateUserAvatarLoadingStatus === 'loading';

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
      removeUserAvatar,
    }),
    [removeUserAvatar, userAvatarSaveInProgress],
  );

  return (
    <EditUserAvatarContext.Provider value={context}>
      {children}
    </EditUserAvatarContext.Provider>
  );
}

export { EditUserAvatarContext, EditUserAvatarProvider };
