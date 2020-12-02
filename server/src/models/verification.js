// @flow

import crypto from 'crypto';

import { updateTypes } from 'lib/types/update-types';
import {
  type VerifyField,
  verifyField,
  assertVerifyField,
  type ServerSuccessfulVerificationResult,
} from 'lib/types/verify-types';
import { ServerError } from 'lib/utils/errors';
import bcrypt from 'twin-bcrypt';

import createIDs from '../creators/id-creator';
import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL, mergeOrConditions } from '../database/database';
import type { Viewer } from '../session/viewer';

const day = 24 * 60 * 60 * 1000; // in ms
const verifyCodeLifetimes = {
  [verifyField.EMAIL]: day * 30,
  [verifyField.RESET_PASSWORD]: day,
};

async function createVerificationCode(
  userID: string,
  field: VerifyField,
): Promise<string> {
  const code = crypto.randomBytes(4).toString('hex');
  const hash = bcrypt.hashSync(code);
  const [id] = await createIDs('verifications', 1);
  const time = Date.now();
  const row = [id, userID, field, hash, time];
  const query = SQL`
    INSERT INTO verifications(id, user, field, hash, creation_time)
    VALUES ${[row]}
  `;
  await dbQuery(query);
  return `${code}${parseInt(id, 10).toString(16)}`;
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
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_code');
  }

  const row = result[0];
  if (!bcrypt.compareSync(code, row.hash)) {
    throw new ServerError('invalid_code');
  }

  const field = assertVerifyField(row.field);
  const verifyCodeLifetime = verifyCodeLifetimes[field];
  if (
    verifyCodeLifetime &&
    row.creation_time + verifyCodeLifetime <= Date.now()
  ) {
    // Code is expired. Delete it...
    const deleteQuery = SQL`
      DELETE v, i
      FROM verifications v
      LEFT JOIN ids i ON i.id = v.id
      WHERE v.id = ${id}
    `;
    await dbQuery(deleteQuery);
    throw new ServerError('invalid_code');
  }

  return {
    userID: row.user.toString(),
    field,
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
  await dbQuery(deleteQuery);
}

async function handleCodeVerificationRequest(
  viewer: Viewer,
  code: string,
): Promise<ServerSuccessfulVerificationResult> {
  const result = await verifyCode(code);
  const { userID, field } = result;
  if (field === verifyField.EMAIL) {
    const query = SQL`UPDATE users SET email_verified = 1 WHERE id = ${userID}`;
    await dbQuery(query);
    const updateDatas = [
      {
        type: updateTypes.UPDATE_CURRENT_USER,
        userID,
        time: Date.now(),
      },
    ];
    await createUpdates(updateDatas, {
      viewer,
      updatesForCurrentSession: 'broadcast',
    });
    return { success: true, field: verifyField.EMAIL };
  } else if (field === verifyField.RESET_PASSWORD) {
    const usernameQuery = SQL`SELECT username FROM users WHERE id = ${userID}`;
    const [usernameResult] = await dbQuery(usernameQuery);
    if (usernameResult.length === 0) {
      throw new ServerError('invalid_code');
    }
    const usernameRow = usernameResult[0];
    return {
      success: true,
      field: verifyField.RESET_PASSWORD,
      username: usernameRow.username,
    };
  }
  throw new ServerError('invalid_code');
}

async function deleteExpiredVerifications(): Promise<void> {
  const creationTimeConditions = [];
  for (let field in verifyCodeLifetimes) {
    const lifetime = verifyCodeLifetimes[field];
    const earliestInvalid = Date.now() - lifetime;
    creationTimeConditions.push(
      SQL`v.field = ${field} AND v.creation_time <= ${earliestInvalid}`,
    );
  }
  const creationTimeClause = mergeOrConditions(creationTimeConditions);
  const query = SQL`
    DELETE v, i
    FROM verifications v
    LEFT JOIN ids i ON i.id = v.id
    WHERE
  `;
  query.append(creationTimeClause);
  await dbQuery(query);
}

export {
  createVerificationCode,
  verifyCode,
  clearVerifyCodes,
  handleCodeVerificationRequest,
  deleteExpiredVerifications,
};
