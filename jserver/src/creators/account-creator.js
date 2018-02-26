// @flow

import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';
import createIDs from './id-creator';
import { createNewUserCookie, deleteCookie } from '../session/cookies';
import { sendEmailAddressVerificationEmail } from '../emails/verification';

async function createAccount(
  viewer: Viewer,
  request: RegisterRequest,
): Promise<RegisterResponse> {
  if (request.password.trim() === "") {
    throw new ServerError('empty_password');
  }
  if (request.username.search(validUsernameRegex) === -1) {
    throw new ServerError('invalid_username');
  }
  if (request.email.search(validEmailRegex) === -1) {
    throw new ServerError('invalid_email');
  }

  const usernameQuery = SQL`
    SELECT COUNT(id) AS count
    FROM users
    WHERE LCASE(username) = LCASE(${request.username})
  `;
  const emailQuery = SQL`
    SELECT COUNT(id) AS count
    FROM users
    WHERE LCASE(email) = LCASE(${request.email})
  `;
  const [ [ usernameResult ], [ emailResult ] ] = await Promise.all([
    pool.query(usernameQuery),
    pool.query(emailQuery),
  ]);
  if (usernameResult[0].count !== 0) {
    throw new ServerError('username_taken');
  }
  if (emailResult[0].count !== 0) {
    throw new ServerError('email_taken');
  }

  const hash = bcrypt.hashSync(request.password);
  const time = Date.now();
  const [ id ] = await createIDs("users", 1);
  const newUserRow = [id, request.username, hash, request.email, time];
  const newUserQuery = SQL`
    INSERT INTO users(id, username, hash, email, creation_time)
    VALUES ${[newUserRow]}
  `;
  const [ userViewerData ] = await Promise.all([
    createNewUserCookie(id),
    deleteCookie(viewer.getData()),
    pool.query(newUserQuery),
    sendEmailAddressVerificationEmail(
      id,
      request.username,
      request.email,
      true,
    ),
  ]);
  viewer.setNewCookie(userViewerData);

  return { id };
}

export default createAccount;
