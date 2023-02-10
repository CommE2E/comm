// @flow

import bcrypt from 'twin-bcrypt';

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

const userID = '-1';
const password = 'password';

async function updatePassword() {
  const hash = bcrypt.hashSync(password);
  await dbQuery(SQL`UPDATE users SET hash = ${hash} WHERE id = ${userID}`);
}

main([updatePassword]);
