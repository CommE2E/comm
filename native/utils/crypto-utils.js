// @flow

import * as React from 'react';

import {
  getOlmSessionInitializationData,
  getOlmSessionInitializationDataActionTypes,
} from 'lib/actions/user-actions.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { commCoreModule } from '../native-modules.js';

function useInitialNotificationsEncryptedMessage(): () => Promise<string> {
  const callGetOlmSessionInitializationData = useServerCall(
    getOlmSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(async () => {
    const olmSessionDataPromise = callGetOlmSessionInitializationData();

    await dispatchActionPromise(
      getOlmSessionInitializationDataActionTypes,
      olmSessionDataPromise,
    );

    const { signedIdentityKeysBlob, notifInitializationInfo } =
      await olmSessionDataPromise;

    const { notificationIdentityPublicKeys } = JSON.parse(
      signedIdentityKeysBlob.payload,
    );

    const { prekey, prekeySignature, oneTimeKey } = notifInitializationInfo;
    await commCoreModule.initializeNotificationsSession(
      JSON.stringify(notificationIdentityPublicKeys),
      prekey,
      prekeySignature,
      oneTimeKey,
    );

    return await commCoreModule.generateInitialNotificationsEncryptedMessage();
  }, [callGetOlmSessionInitializationData, dispatchActionPromise]);
}

export { useInitialNotificationsEncryptedMessage };
