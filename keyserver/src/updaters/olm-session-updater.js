// @flow

import type { EncryptResult } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';
import sleep from 'lib/utils/sleep.js';

import { SQL, dbQuery } from '../database/database.js';
import { fetchPickledOlmAccount } from '../fetchers/olm-account-fetchers.js';
import { unpickleOlmSession } from '../utils/olm-utils.js';

const maxOlmSessionUpdateAttemptTime = 30000;
const olmSessionUpdateRetryDelay = 50;

type OlmEncryptionResult = {
  +encryptedMessages: { +[string]: EncryptResult },
  +dbPersistConditionViolated?: boolean,
  +encryptionOrder?: number,
};

async function encryptAndUpdateOlmSession(
  cookieID: string,
  olmSessionType: 'content' | 'notifications',
  messagesToEncrypt: $ReadOnly<{ [string]: string }>,
  dbPersistCondition?: ({ +[string]: EncryptResult }) => boolean,
): Promise<OlmEncryptionResult> {
  const isContent = olmSessionType === 'content';
  const { picklingKey } = await fetchPickledOlmAccount(olmSessionType);
  const olmUpdateAttemptStartTime = Date.now();

  while (
    Date.now() - olmUpdateAttemptStartTime <
    maxOlmSessionUpdateAttemptTime
  ) {
    const [olmSessionResult] = await dbQuery(
      SQL`
        SELECT version, pickled_olm_session 
        FROM olm_sessions
        WHERE cookie_id = ${cookieID} AND is_content = ${isContent}
      `,
    );

    if (olmSessionResult.length === 0) {
      throw new ServerError('missing_olm_session');
    }

    const [{ version, pickled_olm_session: pickledSession }] = olmSessionResult;
    const session = await unpickleOlmSession(pickledSession, picklingKey);

    const encryptedMessages: { [string]: EncryptResult } = {};
    for (const messageName in messagesToEncrypt) {
      encryptedMessages[messageName] = session.encrypt(
        messagesToEncrypt[messageName],
      );
    }

    if (dbPersistCondition && !dbPersistCondition(encryptedMessages)) {
      return { encryptedMessages, dbPersistConditionViolated: true };
    }

    const updatedSession = session.pickle(picklingKey);

    const [transactionResult] = await dbQuery(
      SQL`
        START TRANSACTION;

        SELECT version INTO @currentVersion
        FROM olm_sessions 
        WHERE cookie_id = ${cookieID} AND is_content = ${isContent}
        FOR UPDATE;

        UPDATE olm_sessions
        SET 
          pickled_olm_session = ${updatedSession}, 
          version = ${version} + 1
        WHERE version = ${version} AND is_content = ${isContent} 
          AND cookie_id = ${cookieID};
        
        COMMIT;

        SELECT @currentVersion AS versionOnUpdateAttempt;
      `,
      { multipleStatements: true },
    );

    const selectResult = transactionResult.pop();
    const [{ versionOnUpdateAttempt }] = selectResult;

    if (version === versionOnUpdateAttempt) {
      return { encryptedMessages, encryptionOrder: version };
    }

    await sleep(olmSessionUpdateRetryDelay);
  }

  throw new ServerError('max_olm_account_update_retry_exceeded');
}

export { encryptAndUpdateOlmSession };
