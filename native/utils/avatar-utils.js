// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import type { ClientEmojiAvatar } from 'lib/types/avatar-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { FeatureFlagsContext } from '../components/feature-flags-provider.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';

function useShouldRenderAvatars(): boolean {
  const { configuration: featureFlagConfig } =
    React.useContext(FeatureFlagsContext);

  return !featureFlagConfig['AVATARS_DISPLAY'];
}

function useSaveUserAvatar(): (
  newEmojiAvatarRequest: ClientEmojiAvatar,
) => mixed {
  const callUpdateUserAvatar = useServerCall(updateUserAvatar);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    newEmojiAvatarRequest => {
      const saveAvatarPromise = (async () => {
        try {
          const response = await callUpdateUserAvatar(newEmojiAvatarRequest);
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

export { useShouldRenderAvatars, useSaveUserAvatar };
