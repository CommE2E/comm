// @flow

import type { OLMIdentityKeys } from 'lib/types/crypto-types';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types';

import { commCoreModule } from '../native-modules.js';

function nativeNotificationsSessionCreator(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } =
    notificationsInitializationInfo;
  return commCoreModule.initializeNotificationsSession(
    JSON.stringify(notificationsIdentityKeys),
    prekey,
    prekeySignature,
    oneTimeKey,
  );
}

async function getContentSigningKey(): Promise<string> {
  await commCoreModule.initializeCryptoAccount();
  const {
    primaryIdentityPublicKeys: { ed25519 },
  } = await commCoreModule.getUserPublicKey();
  return ed25519;
}

export { getContentSigningKey, nativeNotificationsSessionCreator };
