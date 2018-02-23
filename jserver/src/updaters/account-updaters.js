// @flow

import type { AccountUpdate } from 'lib/types/user-types';
import type { Viewer } from '../session/viewer';
import type { PasswordResetRequest } from 'lib/types/account-types';

import bcrypt from 'twin-bcrypt';

import { validEmailRegex } from 'lib/shared/account-regexes';
import { promiseAll } from 'lib/utils/promises';
import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import { sendEmailAddressVerificationEmail } from '../emails/verification';
import { sendPasswordResetEmail } from '../emails/reset-password';

async function accountUpdater(
  viewer: Viewer,
  update: AccountUpdate,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const email = update.updatedFields.email;
  const newPassword = update.updatedFields.password;

  const fetchPromises = {};
  if (email) {
    if (email.search(validEmailRegex) === -1) {
      throw new ServerError('invalid_email');
    }
    fetchPromises.emailQuery = pool.query(SQL`
      SELECT COUNT(id) AS count FROM users WHERE email = ${email}
    `);
  }
  fetchPromises.verifyQuery = pool.query(SQL`
    SELECT username, email, hash FROM users WHERE id = ${viewer.userID}
  `);
  const { verifyQuery, emailQuery } = await promiseAll(fetchPromises);

  const [ verifyResult ] = verifyQuery;
  if (verifyResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const verifyRow = verifyResult[0];
  if (!bcrypt.compareSync(update.currentPassword, verifyRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const savePromises = [];
  const changedFields = {};
  if (email && email !== verifyRow.email) {
    const [ emailResult ] = emailQuery;
    const emailRow = emailResult[0];
    if (emailRow.count !== 0) {
      throw new ServerError('email_taken');
    }
    changedFields.email = email;
    changedFields.email_verified = 0;
    savePromises.push(
      sendEmailAddressVerificationEmail(
        viewer.userID,
        verifyRow.username,
        email,
      ),
    );
  }
  if (newPassword) {
    changedFields.hash = bcrypt.hashSync(newPassword);
  }

  if (Object.keys(changedFields).length > 0) {
    savePromises.push(pool.query(SQL`
      UPDATE users SET ${changedFields} WHERE id = ${viewer.userID}
    `));
  }
  await Promise.all(savePromises);
}

async function checkAndSendVerificationEmail(
  viewer: Viewer,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const query = SQL`
    SELECT username, email, email_verified
    FROM users
    WHERE id = ${viewer.userID}
  `;
  const [ result ] = await pool.query(query);
  if (result.length === 0) {
    throw new ServerError('internal_error');
  }
  const row = result[0];
  if (row.email_verified) {
    throw new ServerError('already_verified');
  }

  await sendEmailAddressVerificationEmail(
    viewer.userID,
    row.username,
    row.email,
  );
}

async function checkAndSendPasswordResetEmail(request: PasswordResetRequest) {
  const query = SQL`
    SELECT id, username, email
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  const [ result ] = await pool.query(query);
  if (result.length === 0) {
    throw new ServerError('invalid_user');
  }
  const row = result[0];

  await sendPasswordResetEmail(
    row.id.toString(),
    row.username,
    row.email,
  );
}

export {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
};
