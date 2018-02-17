// @flow

import { type VerifyField, assertVerifyField } from 'lib/types/verify-types';

import crypto from 'crypto';
import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import createIDs from '../creators/id-creator';

const verifyCodeLifetime = 24 * 60 * 60 * 1000; // in ms

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

type CodeVerification = {|
  userID: string,
  field: VerifyField,
|};
async function verifyCode(hex: string): Promise<CodeVerification> {
  const code = hex.substr(0, 8);
  const id = parseInt(hex.substr(8), 16);

  const query = SQL`
    SELECT hash, user, field, creation_time
    FROM verifications WHERE id = ${id}
  `;
  const [ result ] = await pool.query(query);
  if (result.length === 0) {
    throw new ServerError('invalid_code');
  }

  const row = result[0];
  if (!bcrypt.compareSync(code, row.hash)) {
    throw new ServerError('invalid_code');
  }

  if (row.creation_time + verifyCodeLifetime < Date.now()) {
    // Code is expired. Delete it...
    const deleteQuery = SQL`
      DELETE v, i
      FROM verifications v
      LEFT JOIN ids i ON i.id = v.id
      WHERE v.id = ${id}
    `;
    await pool.query(deleteQuery);
    throw new ServerError('invalid_code');
  }

  return {
    userID: row.user.toString(),
    field: assertVerifyField(row.field),
  };
}

// Call this function after a successful verification
async function clearVerifyCodes(result: CodeVerification) {
  const deleteQuery = SQL`
    DELETE v, i
    FROM verifications v
    LEFT JOIN ids i ON i.id = v.id
    WHERE v.user = ${result.userID} and v.field = ${result.field}
  `;
  await pool.query(deleteQuery);
}

export {
  createVerificationCode,
  verifyCode,
  clearVerifyCodes,
};
