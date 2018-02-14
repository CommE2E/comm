// @flow

import type { VerifyField } from 'lib/types/verify-types';

import crypto from 'crypto';
import bcrypt from 'twin-bcrypt';

import { pool, SQL } from '../database';
import createIDs from './id-creator';

async function createVerificationCode(
  userID: string,
  field: VerifyField,
): Promise<string> {
  const code = crypto.randomBytes(4).toString('hex');
  const hash = bcrypt.hashSync(code);
  const [ id ] = await createIDs("verifications", 1);
  const time = Date.now();
  const row = [id, userID, field, hash, time];
  const query = SQL`
    INSERT INTO verifications(id, user, field, hash, creation_time)
    VALUES ${[row]}
  `;
  await pool.query(query);
  return `${code}${parseInt(id).toString(16)}`;
}

export default createVerificationCode;
