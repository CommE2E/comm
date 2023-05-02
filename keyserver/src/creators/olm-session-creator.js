// @flow

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { createPickledOlmSession } from '../utils/olm-utils.js';

async function createOlmSession(
  initialEncryptedMessage: string,
  olmSessionType: 'content' | 'notifications',
  cookieID: string,
): Promise<void> {
  const { account, picklingKey } = await fetchOlmAccount(olmSessionType);
  let pickledOlmSession;
  try {
    pickledOlmSession = await createPickledOlmSession(
      account,
      picklingKey,
      initialEncryptedMessage,
    );
  } catch (e) {
    throw new ServerError('olm_session_creation_failure');
  }

  const isContent = olmSessionType === 'content';
  // We match the native client behavior here where olm session is overwritten
  // in case it is initialized twice for the same pair of identities
  await dbQuery(
    SQL`
      INSERT INTO olm_sessions (cookie_id, is_content, pickled_olm_session)
      VALUES (${cookieID}, ${isContent}, ${pickledOlmSession})
      ON DUPLICATE KEY UPDATE
        pickled_olm_session = ${pickledOlmSession}
    `,
  );
}

export { createOlmSession };
