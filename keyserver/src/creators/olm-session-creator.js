// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { createPickledOlmSession } from '../utils/olm-utils.js';

async function createOlmSession(
  initialEncryptedMessage: string,
  olmSessionType: 'content' | 'notifications',
  cookieID: string,
): Promise<void> {
  const callback = (account: OlmAccount, picklingKey: string) =>
    createPickledOlmSession(account, picklingKey, initialEncryptedMessage);

  let pickledOlmSession;
  try {
    pickledOlmSession = await fetchCallUpdateOlmAccount(
      olmSessionType,
      callback,
    );
  } catch (e) {
    console.warn(
      `failed to create olm session of type: ${olmSessionType}` +
        `for user with cookie id: ${cookieID}`,
      e,
    );
    throw new ServerError('olm_session_creation_failure');
  }

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

export { createOlmSession };
