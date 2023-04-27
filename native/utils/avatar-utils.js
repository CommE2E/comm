// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { displayActionResultModal } from '../navigation/action-result-modal.js';

function useShouldRenderAvatars(): boolean {
  return true;
}

function useSaveUserAvatar(): (
  newAvatarRequest: UpdateUserAvatarRequest,
) => mixed {
  const callUpdateUserAvatar = useServerCall(updateUserAvatar);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    newAvatarRequest => {
      const saveAvatarPromise = (async () => {
        try {
          const response = await callUpdateUserAvatar(newAvatarRequest);
          displayActionResultModal('Avatar updated!');

          return response;
        } catch (e) {
          Alert.alert(
            'Couldn’t save avatar',
            'Please try again later',
            [{ text: 'OK' }],
            {
              cancelable: true,
            },
          );
          throw e;
        }
      })();

      dispatchActionPromise(updateUserAvatarActionTypes, saveAvatarPromise);
    },
    [callUpdateUserAvatar, dispatchActionPromise],
  );
}

function useSaveThreadAvatar(): (
  newAvatarRequest: UpdateUserAvatarRequest,
  threadID: string,
) => mixed {
  const callChangeThreadSettings = useServerCall(changeThreadSettings);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (newAvatarRequest, threadID) => {
      const saveAvatarPromise = (async () => {
        try {
          const response = await callChangeThreadSettings({
            threadID,
            changes: { avatar: newAvatarRequest },
          });
          displayActionResultModal('Avatar updated!');

          return response;
        } catch (e) {
          Alert.alert(
            'Couldn’t save avatar',
            'Please try again later',
            [{ text: 'OK' }],
            {
              cancelable: true,
            },
          );
          throw e;
        }
      })();

      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        saveAvatarPromise,
        { customKeyName: `${changeThreadSettingsActionTypes.started}:avatar` },
      );
    },
    [callChangeThreadSettings, dispatchActionPromise],
  );
}

export { useShouldRenderAvatars, useSaveUserAvatar, useSaveThreadAvatar };
