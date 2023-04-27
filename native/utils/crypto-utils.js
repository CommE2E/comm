// @flow

import * as React from 'react';

import {
  getOlmNotifsSessionInitializationData,
  getOlmNotifsSessionInitializationDataActionTypes,
} from 'lib/actions/user-actions.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { commCoreModule } from '../native-modules.js';

function useInitialNotificationsEncryptedMessage(): (
  oneTimeKeysCount: number,
) => Promise<string> {
  const callGetOlmNotifsSessionInitializationData = useServerCall(
    getOlmNotifsSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async (oneTimeKeysCount: number) => {
      const olmNotifsSessionDataPromise =
        callGetOlmNotifsSessionInitializationData({ oneTimeKeysCount });
      await dispatchActionPromise(
        getOlmNotifsSessionInitializationDataActionTypes,
        olmNotifsSessionDataPromise,
      );

      const { signedIdentityKeysBlob, prekey, oneTimeKeys } =
        await olmNotifsSessionDataPromise;

      const { notificationIdentityPublicKeys } = JSON.parse(
        signedIdentityKeysBlob.payload,
      );

      await commCoreModule.initializeNotificationsSession(
        JSON.stringify(notificationIdentityPublicKeys),
        prekey,
        oneTimeKeys,
      );

      return await commCoreModule.generateInitialNotificationsEncryptedMessage();
    },
    [callGetOlmNotifsSessionInitializationData, dispatchActionPromise],
  );
}

export { useInitialNotificationsEncryptedMessage };
