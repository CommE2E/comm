// @flow

import bcrypt from 'twin-bcrypt';

import type {
  ResetPasswordRequest,
  UpdatePasswordRequest,
} from 'lib/types/account-types';
import { updateTypes } from 'lib/types/update-types';
import type { AccountUpdate } from 'lib/types/user-types';
import { ServerError } from 'lib/utils/errors';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import { sendPasswordResetEmail } from '../emails/reset-password';
import type { Viewer } from '../session/viewer';

async function accountUpdater(
  viewer: Viewer,
  update: AccountUpdate,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const newPassword = update.updatedFields.password;
  if (!newPassword) {
    // If it's an old client it may have given us an email,
    // but we don't store those anymore
    return;
  }

  const verifyQuery = SQL`
    SELECT username, hash FROM users WHERE id = ${viewer.userID}
  `;
  const [verifyResult] = await dbQuery(verifyQuery);
  if (verifyResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const verifyRow = verifyResult[0];
  if (!bcrypt.compareSync(update.currentPassword, verifyRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const changedFields = { hash: bcrypt.hashSync(newPassword) };
  const saveQuery = SQL`
    UPDATE users SET ${changedFields} WHERE id = ${viewer.userID}
  `;
  await dbQuery(saveQuery);

  const updateDatas = [
    {
      type: updateTypes.UPDATE_CURRENT_USER,
      userID: viewer.userID,
      time: Date.now(),
    },
  ];
  await createUpdates(updateDatas, {
    viewer,
    updatesForCurrentSession: 'broadcast',
  });
}

// eslint-disable-next-line no-unused-vars
async function checkAndSendVerificationEmail(viewer: Viewer): Promise<void> {
  // We don't want to crash old clients that call this,
  // but we have nothing we can do because we no longer store email addresses
}

async function checkAndSendPasswordResetEmail(request: ResetPasswordRequest) {
  const query = SQL`
    SELECT id, username, email
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_user');
  }
  const row = result[0];

  await sendPasswordResetEmail(row.id.toString(), row.username, row.email);
}

/* eslint-disable no-unused-vars */
async function updatePassword(
  viewer: Viewer,
  request: UpdatePasswordRequest,
): Promise<void> {
  /* eslint-enable no-unused-vars */
  // We have no way to handle this request anymore
  throw new ServerError('deprecated');
}

export {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
};
