// @flow

import { main } from './utils.js';
import { privilegedResetUserPassword } from '../utils/identity-utils.js';

async function resetIdentityUserPassword() {
  const targetUsername = '';
  const password = '';
  await privilegedResetUserPassword(targetUsername, password);
}

main([resetIdentityUserPassword]);
