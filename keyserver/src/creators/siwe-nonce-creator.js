// @flow

import { dbQuery, SQL } from '../database/database.js';

async function createSIWENonceEntry(nonce: string): Promise<void> {
  const time = Date.now();
  const query = SQL`
    INSERT INTO siwe_nonces(nonce, creation_time)
    VALUES ${[[nonce, time]]}
  `;
  await dbQuery(query);
}

export { createSIWENonceEntry };
