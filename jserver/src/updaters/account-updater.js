// @flow

import type { AccountUpdate } from 'lib/types/user-types';
import type { UserViewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { validEmailRegex } from 'lib/shared/account-regexes';
import { promiseAll } from 'lib/utils/promises';
import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';

async function accountUpdater(viewer: UserViewer, update: AccountUpdate) {
  const email = update.updatedFields.email;
  const newPassword = update.updatedFields.password;

  const promises = {};
  if (email) {
    if (email.search(validEmailRegex) === -1) {
      throw new ServerError('invalid_email');
    }
    promises.emailQuery = pool.query(SQL`
      SELECT COUNT(id) AS count FROM users WHERE email = ${email}
    `);
  }
  promises.verifyQuery = pool.query(SQL`
    SELECT username, email, hash FROM users WHERE id = ${viewer.userID}
  `);
  const { verifyQuery, emailQuery } = await promiseAll(promises);

  const [ verifyResult ] = verifyQuery;
  if (verifyResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const verifyRow = verifyResult[0];
  if (!bcrypt.compareSync(update.currentPassword, verifyRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const changedFields = {};
  if (email) {
    const [ emailResult ] = emailQuery;
    const emailRow = emailResult[0];
    if (emailRow.count !== 0) {
      throw new ServerError('email_taken');
    }
    changedFields.email = email;
    changedFields.email_verified = 0;
    // TODO verify email
  }
  if (newPassword) {
    changedFields.hash = bcrypt.hashSync(newPassword);
  }

  if (Object.keys(changedFields).length > 0) {
    pool.query(SQL`
      UPDATE users SET ${changedFields} WHERE id = ${viewer.userID}
    `);
  }
}

export {
  accountUpdater,
};
