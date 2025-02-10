// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { createPickledOlmSession } from '../utils/olm-objects.js';

async function createOlmSession(
  initialEncryptedMessage: string,
  olmSessionType: 'content' | 'notifications',
  theirCurve25519Key?: string,
): Promise<string> {
  const callback = (account: OlmAccount, picklingKey: string) =>
    createPickledOlmSession(
      account,
      picklingKey,
      initialEncryptedMessage,
      theirCurve25519Key,
    );

  try {
    return await fetchCallUpdateOlmAccount(olmSessionType, callback);
  } catch (e) {
    console.warn(`failed to create olm session of type: ${olmSessionType}`, e);
    throw new ServerError('olm_session_creation_failure');
  }
}

async function persistFreshOlmSession(
  pickledOlmSession: string,
  olmSessionType: 'content' | 'notifications',
  cookieID: string,
): Promise<void> {
  const isContent = olmSessionType === 'content';
  // We match the native client behavior here where olm session is overwritten
  // in case it is initialized twice for the same pair of identities
  await dbQuery(
    SQL`
      INSERT INTO olm_sessions (cookie_id, is_content, 
        version, pickled_olm_session)
      VALUES (${cookieID}, ${isContent}, 0, ${pickledOlmSession})
      ON DUPLICATE KEY UPDATE
        pickled_olm_session = ${pickledOlmSession}
    `,
  );
}

async function createAndPersistOlmSession(
  initialEncryptedMessage: string,
  olmSessionType: 'content' | 'notifications',
  cookieID: string,
  theirCurve25519Key?: string,
): Promise<void> {
  const pickledOlmSession = await createOlmSession(
    initialEncryptedMessage,
    olmSessionType,
    theirCurve25519Key,
  );

  await persistFreshOlmSession(pickledOlmSession, olmSessionType, cookieID);
}

export { createOlmSession, persistFreshOlmSession, createAndPersistOlmSession };
