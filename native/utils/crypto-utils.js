// @flow

import type { OLMIdentityKeys } from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import { commCoreModule } from '../native-modules.js';

function nativeNotificationsSessionCreator(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  keyserverID: string,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } =
    notificationsInitializationInfo;
  return commCoreModule.initializeNotificationsSession(
    JSON.stringify(notificationsIdentityKeys),
    prekey,
    prekeySignature,
    oneTimeKey,
    keyserverID,
  );
}

function nativeOutboundContentSessionCreator(
  contentIdentityKeys: OLMIdentityKeys,
  contentInitializationInfo: OlmSessionInitializationInfo,
  deviceID: string,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } = contentInitializationInfo;
  const identityKeys = JSON.stringify({
    curve25519: contentIdentityKeys.curve25519,
    ed25519: contentIdentityKeys.ed25519,
  });

  return commCoreModule.initializeContentOutboundSession(
    identityKeys,
    prekey,
    prekeySignature,
    oneTimeKey,
    deviceID,
  );
}

export {
  nativeNotificationsSessionCreator,
  nativeOutboundContentSessionCreator,
};
