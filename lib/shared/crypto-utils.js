// @flow

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
import { useLegacyAshoatKeyserverCall } from '../utils/action-utils.js';
import type {
  CallSingleKeyserverEndpointOptions,
  CallSingleKeyserverEndpoint,
} from '../utils/call-single-keyserver-endpoint.js';
import { values, entries } from '../utils/objects.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';

export type InitialNotifMessageOptions = {
  +callSingleKeyserverEndpoint?: ?CallSingleKeyserverEndpoint,
  +callSingleKeyserverEndpointOptions?: ?CallSingleKeyserverEndpointOptions,
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
  const callGetOlmSessionInitializationData = useLegacyAshoatKeyserverCall(
    getOlmSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async options => {
      const callSingleKeyserverEndpoint = options?.callSingleKeyserverEndpoint;
      const callSingleKeyserverEndpointOptions =
        options?.callSingleKeyserverEndpointOptions;

      const initDataAction = callSingleKeyserverEndpoint
        ? getOlmSessionInitializationData(callSingleKeyserverEndpoint)
        : callGetOlmSessionInitializationData;
      const olmSessionDataPromise = initDataAction(
        callSingleKeyserverEndpointOptions,
      );

      void dispatchActionPromise(
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

function getOneTimeKeyArray(
  oneTimeKeys: OLMOneTimeKeys,
): $ReadOnlyArray<string> {
  return entries(oneTimeKeys.curve25519).map(([key, value]: [string, string]) =>
    JSON.stringify({ curve25519: { [key]: value } }),
  );
}

export {
  getOneTimeKeyValues,
  getPrekeyValue,
  getOneTimeKeyValuesFromBlob,
  getPrekeyValueFromBlob,
  initialEncryptedMessageContent,
  useInitialNotificationsEncryptedMessage,
  getOneTimeKeyArray,
};
