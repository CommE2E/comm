// @flow

import {
  type VerifyField,
  verifyField,
  assertVerifyField,
  type VerificationResult,
} from 'lib/types/verify-types';

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

async function handleCodeVerificationRequest(
  code: string,
): Promise<?VerificationResult> {
  const result = await verifyCode(code);
  const { userID, field } = result;
  if (field === verifyField.EMAIL) {
    const query = SQL`UPDATE users SET email_verified = 1 WHERE id = ${userID}`;
    await Promise.all([
      pool.query(query),
      clearVerifyCodes(result),
    ]);
    return { field: verifyField.EMAIL, userID };
  } else if (field === verifyField.RESET_PASSWORD) {
    const usernameQuery = SQL`SELECT username FROM users WHERE id = ${userID}`;
    const [ usernameResult ] = await pool.query(usernameQuery);
    if (usernameResult.length === 0) {
      throw new ServerError('invalid_code');
    }
    const usernameRow = usernameResult[0];
    return {
      field: verifyField.RESET_PASSWORD,
      userID,
      resetPasswordUsername: usernameRow.username,
    };
  }
  return null;
}

export {
  createVerificationCode,
  verifyCode,
  clearVerifyCodes,
  handleCodeVerificationRequest,
};
