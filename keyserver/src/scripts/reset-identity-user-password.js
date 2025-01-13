// @flow

import { main } from './utils.js';
import { privilegedResetUserPassword } from '../utils/identity-utils.js';

async function resetIdentityUserPassword() {
  const targetUsername = '';
  const password = '';

  // when true, user is reset to unsigned device list without password change
  const skipPasswordReset = false;

  await privilegedResetUserPassword(
    targetUsername,
    password,
    skipPasswordReset,
  );
}

main([resetIdentityUserPassword]);
