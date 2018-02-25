// @flow

import type {
  CodeVerificationRequest,
  HandleVerificationCodeResult,
} from 'lib/types/verify-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { verifyField } from 'lib/types/verify-types';

import { tShape } from '../utils/tcomb-utils';
import { verifyCode, clearVerifyCodes } from '../models/verification';
import { pool, SQL } from '../database';

const codeVerificationRequestInputValidator = tShape({
  code: t.String,
});

async function codeVerificationResponder(
  viewer: Viewer,
  input: any,
): Promise<HandleVerificationCodeResult> {
  const codeVerificationRequest: CodeVerificationRequest = input;
  if (!codeVerificationRequestInputValidator.is(codeVerificationRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const result = await verifyCode(codeVerificationRequest.code);
  const { userID, field } = result;
  if (field === verifyField.EMAIL) {
    const query = SQL`UPDATE users SET email_verified = 1 WHERE id = ${userID}`;
    await Promise.all([
      pool.query(query),
      clearVerifyCodes(result),
    ]);
    return { verifyField: field };
  } else if (field === verifyField.RESET_PASSWORD) {
    const usernameQuery = SQL`SELECT username FROM users WHERE id = ${userID}`;
    const [ usernameResult ] = await pool.query(usernameQuery);
    if (usernameResult.length === 0) {
      throw new ServerError('invalid_code');
    }
    const usernameRow = usernameResult[0];
    return { verifyField: field, resetPasswordUsername: usernameRow.username };
  } else {
    throw new ServerError('unhandled_field');
  }
}

export {
  codeVerificationResponder,
};
