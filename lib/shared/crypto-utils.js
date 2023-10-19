//@flow

import * as React from 'react';

import {
  getOlmSessionInitializationData,
  getOlmSessionInitializationDataActionTypes,
} from '../actions/user-actions.js';
import type {
  OLMIdentityKeys,
  OLMOneTimeKeys,
  OLMPrekey,
} from '../types/crypto-types';
import type { OlmSessionInitializationInfo } from '../types/request-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from '../utils/action-utils.js';
import type {
  CallServerEndpointOptions,
  CallServerEndpoint,
} from '../utils/call-server-endpoint.js';
import { values } from '../utils/objects.js';

export type InitialNotifMessageOptions = {
  +callServerEndpoint?: ?CallServerEndpoint,
  +callServerEndpointOptions?: ?CallServerEndpointOptions,
};

const initialEncryptedMessageContent = {
  type: 'init',
};

function useInitialNotificationsEncryptedMessage(
  platformSpecificSessionCreator: (
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
  ) => Promise<string>,
): (options?: ?InitialNotifMessageOptions) => Promise<string> {
  const callGetOlmSessionInitializationData = useServerCall(
    getOlmSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async options => {
      const callServerEndpoint = options?.callServerEndpoint;
      const callServerEndpointOptions = options?.callServerEndpointOptions;

      const initDataAction = callServerEndpoint
        ? getOlmSessionInitializationData(callServerEndpoint)
        : callGetOlmSessionInitializationData;
      const olmSessionDataPromise = initDataAction(callServerEndpointOptions);

      dispatchActionPromise(
        getOlmSessionInitializationDataActionTypes,
        olmSessionDataPromise,
      );

      const { signedIdentityKeysBlob, notifInitializationInfo } =
        await olmSessionDataPromise;

      const { notificationIdentityPublicKeys } = JSON.parse(
        signedIdentityKeysBlob.payload,
      );

      return await platformSpecificSessionCreator(
        notificationIdentityPublicKeys,
        notifInitializationInfo,
      );
    },
    [
      callGetOlmSessionInitializationData,
      dispatchActionPromise,
      platformSpecificSessionCreator,
    ],
  );
}

function getOneTimeKeyValues(
  oneTimeKeys: OLMOneTimeKeys,
): $ReadOnlyArray<string> {
  return values(oneTimeKeys.curve25519);
}

function getPrekeyValue(prekey: OLMPrekey): string {
  const [prekeyValue] = values(prekey.curve25519);
  return prekeyValue;
}

function getOneTimeKeyValuesFromBlob(keyBlob: string): $ReadOnlyArray<string> {
  const oneTimeKeys: OLMOneTimeKeys = JSON.parse(keyBlob);
  return getOneTimeKeyValues(oneTimeKeys);
}

function getPrekeyValueFromBlob(prekeyBlob: string): string {
  const prekey: OLMPrekey = JSON.parse(prekeyBlob);
  return getPrekeyValue(prekey);
}

export {
  getOneTimeKeyValues,
  getPrekeyValue,
  getOneTimeKeyValuesFromBlob,
  getPrekeyValueFromBlob,
  initialEncryptedMessageContent,
  useInitialNotificationsEncryptedMessage,
};
