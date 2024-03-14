// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  getOlmSessionInitializationData,
  getOlmSessionInitializationDataActionTypes,
} from '../actions/user-actions.js';
import { cookieSelector } from '../selectors/keyserver-selectors.js';
import { OlmSessionCreatorContext } from '../shared/olm-session-creator-context.js';
import type { OLMOneTimeKeys, OLMPrekey } from '../types/crypto-types.js';
import { useLegacyAshoatKeyserverCall } from '../utils/action-utils.js';
import type {
  CallSingleKeyserverEndpointOptions,
  CallSingleKeyserverEndpoint,
} from '../utils/call-single-keyserver-endpoint.js';
import { values } from '../utils/objects.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

export type InitialNotifMessageOptions = {
  +callSingleKeyserverEndpoint?: ?CallSingleKeyserverEndpoint,
  +callSingleKeyserverEndpointOptions?: ?CallSingleKeyserverEndpointOptions,
};

const initialEncryptedMessageContent = {
  type: 'init',
};

function useInitialNotificationsEncryptedMessage(
  keyserverID: string,
): (options?: ?InitialNotifMessageOptions) => Promise<string> {
  const callGetOlmSessionInitializationData = useLegacyAshoatKeyserverCall(
    getOlmSessionInitializationData,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  const cookie = useSelector(cookieSelector(keyserverID));

  const olmSessionCreator = React.useContext(OlmSessionCreatorContext);
  invariant(olmSessionCreator, 'Olm session creator should be set');
  const { notificationsSessionCreator } = olmSessionCreator;

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

      return await notificationsSessionCreator(
        cookie,
        notificationIdentityPublicKeys,
        notifInitializationInfo,
        keyserverID,
      );
    },
    [
      callGetOlmSessionInitializationData,
      dispatchActionPromise,
      notificationsSessionCreator,
      cookie,
      keyserverID,
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
  getOneTimeKeyValuesFromBlob,
  getPrekeyValueFromBlob,
  initialEncryptedMessageContent,
  useInitialNotificationsEncryptedMessage,
};
