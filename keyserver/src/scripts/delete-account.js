// @flow

import { main } from './utils.js';
import { deleteAccount } from '../deleters/account-deleters.js';
import { searchForUser } from '../search/users.js';
import { createScriptViewer } from '../session/scripts.js';
import { privilegedDeleteUsers } from '../utils/identity-utils.js';

async function deleteTargetAccount() {
  const targetUsername = process.argv[2];
  if (!targetUsername) {
    console.warn('no username');
    return;
  }
  const user = await searchForUser(targetUsername);
  if (!user) {
    console.warn(`could not find user with username ${targetUsername}`);
    return;
  }
  const { id } = user;
  await privilegedDeleteUsers([id]);
  const viewer = createScriptViewer(id);
  await deleteAccount(viewer);
}

main([deleteTargetAccount]);
