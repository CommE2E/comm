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
import type { CallServerEndpointOptions } from 'lib/utils/call-server-endpoint.js';

import { commCoreModule } from '../native-modules.js';

function useInitialNotificationsEncryptedMessage(): (
  callServerEndpointOptions?: ?CallServerEndpointOptions,
) => Promise<string> {
  const callGetOlmSessionInitializationData = useServerCall(
    getOlmSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async callServerEndpointOptions => {
      const olmSessionDataPromise = callGetOlmSessionInitializationData(
        callServerEndpointOptions,
      );

      dispatchActionPromise(
        getOlmSessionInitializationDataActionTypes,
        olmSessionDataPromise,
      );

      const { signedIdentityKeysBlob, notifInitializationInfo } =
        await olmSessionDataPromise;

      const { notificationIdentityPublicKeys } = JSON.parse(
        signedIdentityKeysBlob.payload,
      );

      const { prekey, prekeySignature, oneTimeKey } = notifInitializationInfo;
      return await commCoreModule.initializeNotificationsSession(
        JSON.stringify(notificationIdentityPublicKeys),
        prekey,
        prekeySignature,
        oneTimeKey,
      );
    },
    [callGetOlmSessionInitializationData, dispatchActionPromise],
  );
}

async function getPrimaryIdentityPublicKey(): Promise<string> {
  await commCoreModule.initializeCryptoAccount();
  const {
    primaryIdentityPublicKeys: { ed25519 },
  } = await commCoreModule.getUserPublicKey();
  return ed25519;
}

export { useInitialNotificationsEncryptedMessage, getPrimaryIdentityPublicKey };
